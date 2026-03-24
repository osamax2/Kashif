"""
Dimension Calculator Module
Calculates real-world dimensions (width, length, depth, volume) of potholes
using depth maps and optional reference object calibration.
"""
import os
from dataclasses import dataclass
from typing import Optional, Tuple, List, Dict, Any

import cv2
import numpy as np

from depth_estimator import DepthEstimationResult


# Standard reference object sizes (in cm)
REFERENCE_OBJECTS = {
    "credit_card": {
        "width": 8.56,  # cm
        "height": 5.398,  # cm
        "description": "Standard credit/debit card (ISO/IEC 7810 ID-1)"
    },
    "a4_paper": {
        "width": 21.0,  # cm
        "height": 29.7,  # cm
        "description": "A4 paper sheet"
    },
    "smartphone": {
        "width": 7.5,  # cm (average)
        "height": 15.0,  # cm (average)
        "description": "Average smartphone"
    },
    "coin_1eur": {
        "diameter": 2.325,  # cm
        "description": "1 Euro coin"
    },
    "coin_25cent": {
        "diameter": 2.426,  # cm
        "description": "US Quarter (25 cents)"
    },
    "ruler_10cm": {
        "width": 10.0,
        "height": 3.0,
        "description": "10cm ruler segment"
    }
}

# Default assumptions when no reference object
DEFAULT_CAMERA_HEIGHT_M = 1.5  # Assume phone held at ~1.5m height
DEFAULT_CAMERA_FOV_DEG = 70  # Typical smartphone camera FOV


@dataclass
class ReferenceObjectDetection:
    """Detected reference object for calibration"""
    object_type: str
    bbox: Tuple[int, int, int, int]  # x1, y1, x2, y2
    real_width_cm: float
    real_height_cm: float
    pixel_width: int
    pixel_height: int
    scale_factor: float  # cm per pixel


@dataclass
class PotholeDimensions:
    """Calculated real-world dimensions of a pothole"""
    width_cm: float
    length_cm: float
    depth_cm: float
    area_cm2: float
    volume_cm3: float
    
    # Confidence metrics
    calibration_method: str  # "reference_object", "depth_estimation", "assumed"
    confidence: float  # 0-1
    
    # Raw measurements
    pixel_width: int = 0
    pixel_height: int = 0
    depth_map_mean: float = 0.0
    depth_map_max: float = 0.0


class DimensionCalculator:
    """
    Calculate real-world dimensions of potholes using depth maps
    and optional reference object calibration.
    """
    
    def __init__(self, camera_height_m: float = DEFAULT_CAMERA_HEIGHT_M,
                 camera_fov_deg: float = DEFAULT_CAMERA_FOV_DEG):
        self.camera_height_m = camera_height_m
        self.camera_fov_deg = camera_fov_deg
    
    def detect_reference_object(self, image: np.ndarray, 
                                 object_type: str = "credit_card") -> Optional[ReferenceObjectDetection]:
        """
        Detect a reference object in the image for calibration.
        Uses edge detection and contour analysis to find rectangular objects.
        
        Args:
            image: BGR image as numpy array
            object_type: Type of reference object to look for
        
        Returns:
            ReferenceObjectDetection if found, None otherwise
        """
        if object_type not in REFERENCE_OBJECTS:
            return None
        
        ref_info = REFERENCE_OBJECTS[object_type]
        
        # Convert to grayscale
        gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
        
        # Apply Gaussian blur
        blurred = cv2.GaussianBlur(gray, (5, 5), 0)
        
        # Edge detection
        edges = cv2.Canny(blurred, 50, 150)
        
        # Find contours
        contours, _ = cv2.findContours(edges, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
        
        # Look for rectangular shapes with correct aspect ratio
        expected_aspect = ref_info.get("width", 1) / ref_info.get("height", 1)
        if "diameter" in ref_info:
            expected_aspect = 1.0  # Circular object
        
        best_match = None
        best_score = 0
        
        for contour in contours:
            # Approximate polygon
            peri = cv2.arcLength(contour, True)
            approx = cv2.approxPolyDP(contour, 0.02 * peri, True)
            
            # Check if it's a rectangle (4 corners) or circle-ish
            if len(approx) == 4:
                x, y, w, h = cv2.boundingRect(approx)
                
                # Skip tiny or huge detections
                if w < 30 or h < 30 or w > image.shape[1] * 0.5:
                    continue
                
                # Check aspect ratio
                aspect = w / h if h > 0 else 0
                aspect_diff = abs(aspect - expected_aspect)
                
                if aspect_diff < 0.3:  # Allow 30% deviation
                    score = cv2.contourArea(contour) / (aspect_diff + 0.1)
                    if score > best_score:
                        best_score = score
                        best_match = (x, y, x + w, y + h, w, h)
        
        if best_match:
            x1, y1, x2, y2, pw, ph = best_match
            real_w = ref_info.get("width", ref_info.get("diameter", 5))
            real_h = ref_info.get("height", ref_info.get("diameter", 5))
            
            # Calculate scale factor (cm per pixel)
            scale_w = real_w / pw
            scale_h = real_h / ph
            scale_factor = (scale_w + scale_h) / 2  # Average
            
            return ReferenceObjectDetection(
                object_type=object_type,
                bbox=(x1, y1, x2, y2),
                real_width_cm=real_w,
                real_height_cm=real_h,
                pixel_width=pw,
                pixel_height=ph,
                scale_factor=scale_factor
            )
        
        return None
    
    def calculate_scale_from_depth(self, depth_map: np.ndarray, 
                                    image_width: int, image_height: int) -> float:
        """
        Estimate scale factor (cm per pixel) from depth map when no reference object.
        Uses camera geometry and assumed camera height.
        
        Returns:
            Approximate cm per pixel at the ground plane
        """
        # Assume the bottom of the image is at ground level
        # and camera is at camera_height_m looking down at angle
        
        # Field of view calculation
        fov_rad = np.radians(self.camera_fov_deg)
        
        # Width covered at camera_height_m distance
        # Using tan(FOV/2) = (width/2) / distance
        ground_width_m = 2 * self.camera_height_m * np.tan(fov_rad / 2)
        ground_width_cm = ground_width_m * 100
        
        # Scale factor
        scale_factor = ground_width_cm / image_width
        
        return scale_factor
    
    def calculate_depth_from_map(self, depth_map: np.ndarray, 
                                  bbox: Tuple[int, int, int, int],
                                  surrounding_depth: float = None) -> float:
        """
        Calculate actual depth of a pothole in cm from the depth map.
        
        The depth map gives relative depth values. We need to:
        1. Find the depth difference between pothole and surrounding road surface
        2. Convert this to real-world depth using calibration
        
        Args:
            depth_map: Normalized depth map (0-1, higher = further)
            bbox: Bounding box of the pothole (x1, y1, x2, y2)
            surrounding_depth: Optional pre-calculated surrounding depth
        
        Returns:
            Estimated depth in cm
        """
        x1, y1, x2, y2 = bbox
        
        # Extract pothole region
        pothole_region = depth_map[y1:y2, x1:x2]
        
        if pothole_region.size == 0:
            return 5.0  # Default estimate
        
        # Calculate surrounding road surface depth
        if surrounding_depth is None:
            # Sample around the pothole
            margin = 20
            samples = []
            
            # Top
            if y1 - margin >= 0:
                samples.append(depth_map[y1-margin:y1, x1:x2])
            # Bottom
            if y2 + margin < depth_map.shape[0]:
                samples.append(depth_map[y2:y2+margin, x1:x2])
            # Left
            if x1 - margin >= 0:
                samples.append(depth_map[y1:y2, x1-margin:x1])
            # Right
            if x2 + margin < depth_map.shape[1]:
                samples.append(depth_map[y1:y2, x2:x2+margin])
            
            if samples:
                surrounding_depth = np.median(np.concatenate([s.flatten() for s in samples]))
            else:
                surrounding_depth = np.median(depth_map)
        
        # Pothole depth statistics
        pothole_depth_mean = np.mean(pothole_region)
        pothole_depth_max = np.max(pothole_region)
        
        # Depth difference (pothole should be deeper = higher value in relative depth)
        # But this depends on the depth map convention
        # MiDaS/DepthAnything: closer objects have HIGHER values (lighter in visualization)
        # So pothole (lower surface) should have LOWER values
        
        # Calculate depth difference
        depth_diff = surrounding_depth - pothole_depth_mean
        
        # Convert to cm - this is approximate without true calibration
        # Typical pothole depth range: 2-30 cm
        # Normalize the depth difference to this range
        
        # Assume depth map covers 0-50cm depth range
        max_depth_cm = 50.0
        actual_depth_cm = abs(depth_diff) * max_depth_cm
        
        # Clamp to reasonable range
        actual_depth_cm = max(1.0, min(30.0, actual_depth_cm))
        
        return actual_depth_cm
    
    def calculate_dimensions(self, 
                             image: np.ndarray,
                             depth_result: DepthEstimationResult,
                             pothole_bbox: Tuple[int, int, int, int],
                             reference_detection: Optional[ReferenceObjectDetection] = None
                             ) -> PotholeDimensions:
        """
        Calculate real-world dimensions of a pothole.
        
        Args:
            image: Original BGR image
            depth_result: Depth estimation result with depth map
            pothole_bbox: Bounding box of detected pothole (x1, y1, x2, y2)
            reference_detection: Optional reference object for calibration
        
        Returns:
            PotholeDimensions with width, length, depth, area, and volume
        """
        x1, y1, x2, y2 = pothole_bbox
        pixel_width = x2 - x1
        pixel_height = y2 - y1
        
        # Determine scale factor
        if reference_detection:
            scale_factor = reference_detection.scale_factor
            calibration_method = "reference_object"
            confidence = 0.85
        elif depth_result.success and depth_result.depth_map is not None:
            scale_factor = self.calculate_scale_from_depth(
                depth_result.depth_map,
                image.shape[1],
                image.shape[0]
            )
            calibration_method = "depth_estimation"
            confidence = 0.6 + (depth_result.confidence_score * 0.2 if depth_result.confidence_score else 0)
        else:
            # Fallback: assume standard phone photo from ~1.5m
            scale_factor = self.calculate_scale_from_depth(
                None, image.shape[1], image.shape[0]
            )
            calibration_method = "assumed"
            confidence = 0.3
        
        # Calculate width and length in cm
        width_cm = pixel_width * scale_factor
        length_cm = pixel_height * scale_factor
        
        # Calculate area (approximate as ellipse)
        area_cm2 = np.pi * (width_cm / 2) * (length_cm / 2)
        
        # Calculate depth from depth map
        if depth_result.success and depth_result.depth_map is not None:
            # Resize depth map to match image if needed
            depth_map = depth_result.depth_map
            if depth_map.shape[:2] != image.shape[:2]:
                depth_map = cv2.resize(depth_map, (image.shape[1], image.shape[0]))
            
            depth_cm = self.calculate_depth_from_map(depth_map, pothole_bbox)
            depth_map_mean = float(np.mean(depth_map[y1:y2, x1:x2]))
            depth_map_max = float(np.max(depth_map[y1:y2, x1:x2]))
        else:
            # Estimate depth based on size (larger potholes tend to be deeper)
            # Rough heuristic: depth ≈ width / 4
            depth_cm = max(width_cm / 4, 3.0)
            depth_map_mean = 0.0
            depth_map_max = 0.0
        
        # Calculate volume (approximate as half-ellipsoid)
        # V = (2/3) * π * a * b * c where a, b are radii and c is depth
        volume_cm3 = (2/3) * np.pi * (width_cm/2) * (length_cm/2) * depth_cm
        
        return PotholeDimensions(
            width_cm=round(width_cm, 1),
            length_cm=round(length_cm, 1),
            depth_cm=round(depth_cm, 1),
            area_cm2=round(area_cm2, 1),
            volume_cm3=round(volume_cm3, 1),
            calibration_method=calibration_method,
            confidence=round(confidence, 2),
            pixel_width=pixel_width,
            pixel_height=pixel_height,
            depth_map_mean=round(depth_map_mean, 4),
            depth_map_max=round(depth_map_max, 4)
        )
    
    def calculate_all_dimensions(self,
                                  image: np.ndarray,
                                  depth_result: DepthEstimationResult,
                                  pothole_bboxes: List[Tuple[int, int, int, int]],
                                  try_reference_detection: bool = True
                                  ) -> List[PotholeDimensions]:
        """
        Calculate dimensions for multiple potholes in an image.
        
        Args:
            image: Original BGR image
            depth_result: Depth estimation result
            pothole_bboxes: List of pothole bounding boxes
            try_reference_detection: Whether to try detecting reference objects
        
        Returns:
            List of PotholeDimensions for each pothole
        """
        # Try to detect reference object
        reference = None
        if try_reference_detection:
            for ref_type in ["credit_card", "smartphone", "ruler_10cm"]:
                reference = self.detect_reference_object(image, ref_type)
                if reference:
                    print(f"✅ Detected reference object: {ref_type}")
                    break
        
        # Calculate dimensions for each pothole
        results = []
        for bbox in pothole_bboxes:
            dims = self.calculate_dimensions(image, depth_result, bbox, reference)
            results.append(dims)
        
        return results


def _to_python_float(val) -> float:
    """Convert numpy float to Python float for JSON serialization"""
    if val is None:
        return 0.0
    if hasattr(val, 'item'):
        return float(val.item())
    return float(val)


def dimensions_to_dict(dims: PotholeDimensions) -> Dict[str, Any]:
    """Convert PotholeDimensions to dictionary for JSON serialization"""
    return {
        "width_cm": _to_python_float(dims.width_cm),
        "length_cm": _to_python_float(dims.length_cm),
        "depth_cm": _to_python_float(dims.depth_cm),
        "area_cm2": _to_python_float(dims.area_cm2),
        "volume_cm3": _to_python_float(dims.volume_cm3),
        "calibration_method": dims.calibration_method,
        "confidence": _to_python_float(dims.confidence),
        "pixel_dimensions": {
            "width": int(dims.pixel_width),
            "height": int(dims.pixel_height)
        },
        "depth_map_stats": {
            "mean": _to_python_float(dims.depth_map_mean),
            "max": _to_python_float(dims.depth_map_max)
        }
    }
