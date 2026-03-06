"""
Enhanced Pothole Detector with Depth Estimation
Combines YOLOv8 detection with MiDaS/DepthAnything for accurate dimensions.
"""
import os
import time
from typing import Optional, Tuple, List, Dict, Any
from dataclasses import dataclass

import cv2
import numpy as np

from roboflow_detector import (
    RoboflowPotholeDetector, 
    DetectionResult, 
    PotholeDetection, 
    BoundingBox,
    PotholeEstimator
)
from depth_estimator import DepthEstimator, DepthModel, DepthEstimationResult
from dimension_calculator import DimensionCalculator, PotholeDimensions, dimensions_to_dict, _to_python_float
from detection_filter import DetectionFilter


@dataclass
class EnhancedDetectionResult:
    """Extended detection result with depth-based dimensions"""
    base_result: DetectionResult
    depth_result: Optional[DepthEstimationResult] = None
    dimensions: Optional[List[PotholeDimensions]] = None
    depth_map_path: Optional[str] = None
    
    def to_dict(self) -> Dict[str, Any]:
        result = self.base_result.to_dict()
        
        # Add depth estimation info
        if self.depth_result:
            result["depth_estimation"] = {
                "success": self.depth_result.success,
                "model_used": self.depth_result.model_used,
                "processing_time_ms": _to_python_float(self.depth_result.processing_time_ms),
                "confidence_score": _to_python_float(self.depth_result.confidence_score),
            }
        
        # Add enhanced dimensions
        if self.dimensions:
            result["enhanced_dimensions"] = [
                dimensions_to_dict(d) for d in self.dimensions
            ]
            
            # Update detection entries with better dimensions
            for i, det in enumerate(result.get("detections", [])):
                if i < len(self.dimensions):
                    dim = self.dimensions[i]
                    det["estimated_width_cm"] = _to_python_float(dim.width_cm)
                    det["estimated_height_cm"] = _to_python_float(dim.length_cm)
                    det["estimated_depth_cm"] = _to_python_float(dim.depth_cm)
                    det["estimated_area_cm2"] = _to_python_float(dim.area_cm2)
                    det["estimated_volume_cm3"] = _to_python_float(dim.volume_cm3)
                    det["dimension_confidence"] = _to_python_float(dim.confidence)
                    det["calibration_method"] = dim.calibration_method
        
        if self.depth_map_path:
            result["depth_map_path"] = self.depth_map_path
        
        return result


class EnhancedPotholeDetector:
    """
    Enhanced pothole detector that combines:
    1. YOLOv8 detection via Roboflow
    2. Depth estimation via MiDaS and/or DepthAnything
    3. Real-world dimension calculation with optional reference object calibration
    """
    
    def __init__(
        self,
        roboflow_api_key: Optional[str] = None,
        replicate_api_token: Optional[str] = None,
        depth_model: DepthModel = DepthModel.MIDAS,  # Use MiDaS only for reliability
        enable_depth_estimation: bool = True,
        enable_reference_detection: bool = True,
        camera_height_m: float = 1.5
    ):
        """
        Initialize the enhanced detector.
        
        Args:
            roboflow_api_key: API key for Roboflow (YOLO detection)
            replicate_api_token: API token for Replicate (depth estimation)
            depth_model: Which depth model(s) to use
            enable_depth_estimation: Whether to run depth estimation
            enable_reference_detection: Whether to detect reference objects
            camera_height_m: Assumed camera height for scale estimation
        """
        self.roboflow_detector = RoboflowPotholeDetector(api_key=roboflow_api_key)
        self.depth_model = depth_model
        self.enable_depth = enable_depth_estimation
        self.enable_reference = enable_reference_detection
        
        # Initialize depth estimator if enabled
        self.depth_estimator = None
        if enable_depth_estimation and replicate_api_token:
            try:
                self.depth_estimator = DepthEstimator(api_token=replicate_api_token)
                print("✅ Depth estimator initialized with Replicate API")
            except Exception as e:
                print(f"⚠️ Could not initialize depth estimator: {e}")
        
        # Initialize dimension calculator
        self.dimension_calculator = DimensionCalculator(camera_height_m=camera_height_m)
    
    def detect(
        self,
        image_path: str,
        save_annotated: bool = True,
        save_depth_map: bool = False,
        output_dir: Optional[str] = None
    ) -> EnhancedDetectionResult:
        """
        Detect potholes with enhanced dimension estimation.
        
        Args:
            image_path: Path to the image file
            save_annotated: Whether to save annotated image
            save_depth_map: Whether to save the depth map visualization
            output_dir: Output directory for generated files
        
        Returns:
            EnhancedDetectionResult with detections and dimensions
        """
        # Step 1: Run YOLO detection
        print(f"🔍 Running pothole detection on {os.path.basename(image_path)}")
        base_result = self.roboflow_detector.detect(
            image_path,
            save_annotated=save_annotated,
            output_dir=output_dir
        )
        
        if base_result.num_potholes == 0:
            print("ℹ️ No potholes detected, skipping depth estimation")
            return EnhancedDetectionResult(base_result=base_result)
        
        print(f"✅ Detected {base_result.num_potholes} pothole(s)")
        
        # Step 2: Run depth estimation (if enabled and available)
        depth_result = None
        if self.enable_depth and self.depth_estimator:
            print(f"🔬 Running depth estimation ({self.depth_model.value})...")
            try:
                depth_result = self.depth_estimator.estimate(image_path, self.depth_model)
                if depth_result.success:
                    print(f"✅ Depth estimation succeeded: {depth_result.model_used}")
                    if depth_result.confidence_score > 0:
                        print(f"   Model agreement: {depth_result.confidence_score:.2%}")
                    
                    # Step 2b: Re-filter detections using depth map
                    # This catches flat objects (cards, shadows) that passed initial filter
                    # Use higher score threshold since we already passed initial filter
                    # and now have depth info to distinguish real depressions from surface anomalies
                    image = cv2.imread(image_path)
                    if image is not None and depth_result.depth_map is not None:
                        print("🧠 Running depth-based validation on detections...")
                        depth_filter = DetectionFilter(
                            min_confidence=0.35,
                            min_overall_score=0.70  # Stricter with depth data available
                        )
                        valid, rejected = depth_filter.filter_detections(
                            image, base_result.detections, depth_result.depth_map
                        )
                        if rejected:
                            print(f"🚫 Depth filter removed {len(rejected)} flat-area detection(s)")
                            base_result.detections[:] = valid
                            # Re-generate annotated image with only valid detections
                            if save_annotated and valid:
                                annotated_path = self.roboflow_detector._save_annotated_image(
                                    image, valid, image_path, output_dir
                                )
                                base_result.annotated_image_path = annotated_path
                else:
                    print(f"⚠️ Depth estimation failed: {depth_result.error}")
            except Exception as e:
                print(f"❌ Depth estimation error: {e}")
        
        # Step 3: Calculate dimensions (and filter reference object overlaps)
        dimensions = None
        depth_map_path = None
        
        try:
            # Read original image
            image = cv2.imread(image_path)
            if image is None:
                raise ValueError(f"Could not read image: {image_path}")
            
            # Step 3a: Detect reference object and filter overlapping detections
            if self.enable_reference and base_result.detections:
                reference = None
                for ref_type in ["credit_card", "smartphone", "ruler_10cm"]:
                    reference = self.dimension_calculator.detect_reference_object(image, ref_type)
                    if reference:
                        break
                
                if reference:
                    print(f"🎯 Reference object '{reference.object_type}' found at "
                          f"bbox=({reference.bbox[0]},{reference.bbox[1]},{reference.bbox[2]},{reference.bbox[3]})")
                    
                    # Filter out detections that ARE primarily the reference object
                    # But keep detections that CONTAIN the reference (pothole near the card)
                    ref_area = max(
                        (reference.bbox[2] - reference.bbox[0]) * (reference.bbox[3] - reference.bbox[1]), 1
                    )
                    filtered_detections = []
                    for det in base_result.detections:
                        det_bbox = (det.bbox.x1, det.bbox.y1, det.bbox.x2, det.bbox.y2)
                        det_area = max(det.bbox.area, 1)
                        
                        # Calculate intersection
                        ix1 = max(det_bbox[0], reference.bbox[0])
                        iy1 = max(det_bbox[1], reference.bbox[1])
                        ix2 = min(det_bbox[2], reference.bbox[2])
                        iy2 = min(det_bbox[3], reference.bbox[3])
                        
                        if ix2 > ix1 and iy2 > iy1:
                            intersection = (ix2 - ix1) * (iy2 - iy1)
                            # What fraction of the DETECTION is the reference?
                            det_is_ref = intersection / det_area
                            # What fraction of the REFERENCE is in the detection?
                            ref_in_det = intersection / ref_area
                            
                            # Only reject if detection is PRIMARILY the reference object
                            # (reference covers >25% of detection area AND >50% of reference is inside)
                            if det_is_ref > 0.25 and ref_in_det > 0.50:
                                print(f"   🚫 Removed detection (primarily reference object: "
                                      f"det_is_ref={det_is_ref:.0%}, ref_in_det={ref_in_det:.0%}, "
                                      f"conf={det.confidence:.2f})")
                            else:
                                # Detection is much larger than the reference → real pothole near card
                                print(f"   ✅ Kept detection (pothole contains reference: "
                                      f"det_is_ref={det_is_ref:.0%}, conf={det.confidence:.2f})")
                                filtered_detections.append(det)
                        else:
                            filtered_detections.append(det)
                    
                    if len(filtered_detections) < len(base_result.detections):
                        base_result.detections[:] = filtered_detections
                        print(f"   Remaining detections after reference filter: {len(filtered_detections)}")
                        
                        # Re-generate annotated image
                        if save_annotated and filtered_detections:
                            annotated_path = self.roboflow_detector._save_annotated_image(
                                image, filtered_detections, image_path, output_dir
                            )
                            base_result.annotated_image_path = annotated_path
            
            # Step 3b: Extract bounding boxes for remaining detections
            bboxes = [
                (d.bbox.x1, d.bbox.y1, d.bbox.x2, d.bbox.y2)
                for d in base_result.detections
            ]
            
            if not bboxes:
                print("ℹ️ No valid potholes remaining after filtering")
                return EnhancedDetectionResult(base_result=base_result, depth_result=depth_result)
            
            # Step 3c: Calculate dimensions
            if depth_result and depth_result.success:
                dimensions = self.dimension_calculator.calculate_all_dimensions(
                    image=image,
                    depth_result=depth_result,
                    pothole_bboxes=bboxes,
                    try_reference_detection=self.enable_reference
                )
                
                print("📏 Calculated dimensions:")
                for i, dim in enumerate(dimensions):
                    print(f"   Pothole {i+1}: {dim.width_cm}x{dim.length_cm}cm, "
                          f"depth={dim.depth_cm}cm, volume={dim.volume_cm3}cm³ "
                          f"({dim.calibration_method}, conf={dim.confidence:.0%})")
                
                # Save depth map visualization if requested
                if save_depth_map and output_dir:
                    depth_map_path = self._save_depth_map(
                        depth_result.depth_map,
                        bboxes,
                        image_path,
                        output_dir
                    )
            else:
                # Fall back to basic estimation
                print("📏 Using basic dimension estimation (no depth map)")
                dimensions = self._estimate_basic_dimensions(base_result)
                
        except Exception as e:
            print(f"❌ Dimension calculation error: {e}")
        
        return EnhancedDetectionResult(
            base_result=base_result,
            depth_result=depth_result,
            dimensions=dimensions,
            depth_map_path=depth_map_path
        )
    
    @staticmethod
    def _bbox_overlap_ratio(
        bbox1: Tuple[int, int, int, int],
        bbox2: Tuple[int, int, int, int]
    ) -> float:
        """
        Calculate the overlap ratio between two bounding boxes.
        Returns the fraction of bbox2 that is contained within bbox1.
        
        Used to check if a reference object (bbox2) is inside/overlapped 
        by a pothole detection (bbox1).
        """
        x1 = max(bbox1[0], bbox2[0])
        y1 = max(bbox1[1], bbox2[1])
        x2 = min(bbox1[2], bbox2[2])
        y2 = min(bbox1[3], bbox2[3])
        
        if x2 <= x1 or y2 <= y1:
            return 0.0
        
        intersection = (x2 - x1) * (y2 - y1)
        bbox2_area = max((bbox2[2] - bbox2[0]) * (bbox2[3] - bbox2[1]), 1)
        
        return intersection / bbox2_area
    
    def _estimate_basic_dimensions(
        self, 
        result: DetectionResult
    ) -> List[PotholeDimensions]:
        """Fall back to basic dimension estimation without depth map"""
        dimensions = []
        estimator = PotholeEstimator()
        
        for det in result.detections:
            width_cm, height_cm, depth_cm, area_cm2 = estimator.estimate_physical_size(
                det.bbox, result.image_width, result.image_height
            )
            
            # Estimate volume as half-ellipsoid
            volume_cm3 = (2/3) * 3.14159 * (width_cm/2) * (height_cm/2) * depth_cm
            
            dimensions.append(PotholeDimensions(
                width_cm=width_cm,
                length_cm=height_cm,
                depth_cm=depth_cm,
                area_cm2=area_cm2,
                volume_cm3=round(volume_cm3, 1),
                calibration_method="basic_estimation",
                confidence=0.3,
                pixel_width=det.bbox.width,
                pixel_height=det.bbox.height
            ))
        
        return dimensions
    
    def _save_depth_map(
        self,
        depth_map: np.ndarray,
        bboxes: List[Tuple[int, int, int, int]],
        original_path: str,
        output_dir: str
    ) -> str:
        """Save colorized depth map with pothole annotations"""
        # Normalize to 0-255
        depth_norm = (depth_map * 255).astype(np.uint8)
        
        # Apply colormap
        depth_colored = cv2.applyColorMap(depth_norm, cv2.COLORMAP_MAGMA)
        
        # Draw pothole bounding boxes
        for bbox in bboxes:
            x1, y1, x2, y2 = bbox
            cv2.rectangle(depth_colored, (x1, y1), (x2, y2), (0, 255, 0), 2)
        
        # Save
        os.makedirs(output_dir, exist_ok=True)
        base_name = os.path.splitext(os.path.basename(original_path))[0]
        output_path = os.path.join(output_dir, f"{base_name}_depth.png")
        cv2.imwrite(output_path, depth_colored)
        
        return output_path


def create_enhanced_detector(
    roboflow_key: Optional[str] = None,
    replicate_token: Optional[str] = None,
    use_both_models: bool = True
) -> EnhancedPotholeDetector:
    """
    Factory function to create an enhanced detector with environment defaults.
    
    Args:
        roboflow_key: Roboflow API key (uses env ROBOFLOW_API_KEY if not provided)
        replicate_token: Replicate API token (uses env REPLICATE_API_TOKEN if not provided)
        use_both_models: Whether to use both depth models for comparison
    
    Returns:
        Configured EnhancedPotholeDetector
    """
    roboflow_key = roboflow_key or os.getenv("ROBOFLOW_API_KEY")
    replicate_token = replicate_token or os.getenv("REPLICATE_API_TOKEN")
    
    # Use MiDaS only for reliability when not using both models
    depth_model = DepthModel.BOTH if use_both_models else DepthModel.MIDAS
    
    return EnhancedPotholeDetector(
        roboflow_api_key=roboflow_key,
        replicate_api_token=replicate_token,
        depth_model=depth_model,
        enable_depth_estimation=bool(replicate_token),
        enable_reference_detection=True
    )
