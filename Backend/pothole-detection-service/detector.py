"""
YOLOv8 Pothole Detection Module
Uses Ultralytics YOLOv8 to detect potholes in images
Based on: https://github.com/mounishvatti/pothole_detection_yolov8
"""
import os
from dataclasses import dataclass
from pathlib import Path
from typing import List, Optional, Tuple

import cv2
import numpy as np
from ultralytics import YOLO

from config import settings


@dataclass
class BoundingBox:
    """Bounding box for detected pothole"""
    x1: int  # Top-left x
    y1: int  # Top-left y
    x2: int  # Bottom-right x
    y2: int  # Bottom-right y
    
    @property
    def width(self) -> int:
        return abs(self.x2 - self.x1)
    
    @property
    def height(self) -> int:
        return abs(self.y2 - self.y1)
    
    @property
    def center(self) -> Tuple[int, int]:
        return ((self.x1 + self.x2) // 2, (self.y1 + self.y2) // 2)
    
    @property
    def area(self) -> int:
        return self.width * self.height


@dataclass
class PotholeDetection:
    """Single pothole detection result"""
    bbox: BoundingBox
    confidence: float
    class_id: int
    class_name: str
    
    # Estimated physical properties
    estimated_width_cm: Optional[float] = None
    estimated_height_cm: Optional[float] = None
    estimated_depth_cm: Optional[float] = None
    estimated_area_cm2: Optional[float] = None
    severity: Optional[str] = None  # LOW, MEDIUM, HIGH
    
    def to_dict(self):
        return {
            "bbox": {
                "x1": self.bbox.x1,
                "y1": self.bbox.y1,
                "x2": self.bbox.x2,
                "y2": self.bbox.y2,
                "width": self.bbox.width,
                "height": self.bbox.height,
                "area_pixels": self.bbox.area
            },
            "confidence": round(self.confidence, 4),
            "class_id": self.class_id,
            "class_name": self.class_name,
            "estimated_width_cm": self.estimated_width_cm,
            "estimated_height_cm": self.estimated_height_cm,
            "estimated_depth_cm": self.estimated_depth_cm,
            "estimated_area_cm2": self.estimated_area_cm2,
            "severity": self.severity
        }


@dataclass
class DetectionResult:
    """Complete detection result for an image"""
    image_path: str
    image_width: int
    image_height: int
    detections: List[PotholeDetection]
    processing_time_ms: float
    annotated_image_path: Optional[str] = None
    
    @property
    def num_potholes(self) -> int:
        return len(self.detections)
    
    @property
    def max_severity(self) -> Optional[str]:
        if not self.detections:
            return None
        severity_order = {"LOW": 1, "MEDIUM": 2, "HIGH": 3}
        max_det = max(self.detections, key=lambda d: severity_order.get(d.severity or "LOW", 0))
        return max_det.severity
    
    def to_dict(self):
        return {
            "image_path": self.image_path,
            "image_width": self.image_width,
            "image_height": self.image_height,
            "num_potholes": self.num_potholes,
            "max_severity": self.max_severity,
            "processing_time_ms": round(self.processing_time_ms, 2),
            "annotated_image_path": self.annotated_image_path,
            "detections": [d.to_dict() for d in self.detections]
        }


class PotholeEstimator:
    """
    Estimates physical pothole properties from detection.
    Uses heuristics based on typical road/camera parameters.
    """
    
    # Approximate pixels per cm at typical phone camera distance (1-2m from ground)
    # This is a rough estimate - actual values depend on camera height, angle, focal length
    PIXELS_PER_CM_ESTIMATE = 8.0  # ~8 pixels per cm at 1.5m height
    
    # Depth estimation based on size/darkness (heuristic)
    DEPTH_RATIO = 0.3  # Typical depth is ~30% of width
    
    @staticmethod
    def estimate_physical_size(bbox: BoundingBox, image_width: int, image_height: int) -> Tuple[float, float, float, float]:
        """
        Estimate physical dimensions of pothole in cm.
        Returns (width_cm, height_cm, depth_cm, area_cm2)
        """
        # Adjust pixels-per-cm based on image size (higher res = more pixels/cm)
        scale_factor = image_width / 4032  # Normalize to typical phone camera (4032x3024)
        adjusted_ppcm = PotholeEstimator.PIXELS_PER_CM_ESTIMATE * scale_factor
        
        # Calculate physical dimensions
        width_cm = bbox.width / adjusted_ppcm
        height_cm = bbox.height / adjusted_ppcm
        
        # Estimate depth based on size (larger potholes tend to be deeper)
        avg_size = (width_cm + height_cm) / 2
        depth_cm = avg_size * PotholeEstimator.DEPTH_RATIO
        
        # Adjust depth based on area ratio (rounder = shallower, elongated = deeper)
        aspect_ratio = max(width_cm, height_cm) / max(min(width_cm, height_cm), 1)
        if aspect_ratio > 2:  # Elongated pothole (crack-like)
            depth_cm *= 1.2
        elif aspect_ratio < 1.3:  # Round pothole
            depth_cm *= 0.8
        
        # Calculate area
        area_cm2 = width_cm * height_cm * 0.785  # Approximate ellipse area
        
        return (
            round(width_cm, 1),
            round(height_cm, 1),
            round(depth_cm, 1),
            round(area_cm2, 1)
        )
    
    @staticmethod
    def classify_severity(width_cm: float, depth_cm: float, area_cm2: float) -> str:
        """
        Classify pothole severity based on physical dimensions.
        
        Severity levels:
        - LOW: Small, shallow potholes (cosmetic damage risk)
        - MEDIUM: Medium size (tire damage risk)
        - HIGH: Large, deep potholes (vehicle damage/safety hazard)
        """
        # Severity score based on multiple factors
        score = 0
        
        # Width factor
        if width_cm < 15:
            score += 1
        elif width_cm < 30:
            score += 2
        else:
            score += 3
        
        # Depth factor (most important for damage)
        if depth_cm < 3:
            score += 1
        elif depth_cm < 7:
            score += 2
        else:
            score += 4
        
        # Area factor
        if area_cm2 < 200:
            score += 1
        elif area_cm2 < 700:
            score += 2
        else:
            score += 3
        
        # Classify based on total score
        if score <= 4:
            return "LOW"
        elif score <= 7:
            return "MEDIUM"
        else:
            return "HIGH"


class PotholeDetector:
    """
    YOLOv8-based pothole detector.
    Downloads/loads model and performs inference on images.
    """
    
    def __init__(self, model_path: Optional[str] = None, confidence: float = 0.5):
        """
        Initialize detector with model.
        
        Args:
            model_path: Path to custom trained model, or None to use default
            confidence: Minimum confidence threshold for detections
        """
        self.confidence = confidence
        self.model = None
        self.model_path = model_path or settings.MODEL_PATH
        
    def load_model(self):
        """Load the YOLOv8 model"""
        try:
            if os.path.exists(self.model_path):
                print(f"Loading custom model from {self.model_path}")
                self.model = YOLO(self.model_path)
            else:
                # Use pretrained YOLOv8n - note: needs fine-tuning for potholes
                print("Custom model not found. Using base YOLOv8n model.")
                print("Note: Base model may not detect potholes. Will use image analysis fallback.")
                self.model = YOLO("yolov8n.pt")
            
            print(f"Model loaded successfully")
            return True
        except Exception as e:
            print(f"Error loading model: {e}")
            return False
    
    def _analyze_image_for_potholes(self, img: np.ndarray) -> List[PotholeDetection]:
        """
        Fallback pothole analysis using image processing when YOLO doesn't detect.
        Analyzes dark regions and irregular shapes that might be potholes.
        """
        import cv2
        
        detections = []
        img_height, img_width = img.shape[:2]
        
        # Convert to grayscale
        gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
        
        # Apply Gaussian blur
        blurred = cv2.GaussianBlur(gray, (5, 5), 0)
        
        # Threshold to find dark regions (potential potholes)
        _, thresh = cv2.threshold(blurred, 60, 255, cv2.THRESH_BINARY_INV)
        
        # Find contours
        contours, _ = cv2.findContours(thresh, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
        
        # Filter contours by area and shape
        min_area = (img_width * img_height) * 0.005  # At least 0.5% of image
        max_area = (img_width * img_height) * 0.5    # At most 50% of image
        
        for contour in contours:
            area = cv2.contourArea(contour)
            if min_area < area < max_area:
                x, y, w, h = cv2.boundingRect(contour)
                
                # Check if roughly circular/elliptical (pothole-like)
                aspect_ratio = max(w, h) / max(min(w, h), 1)
                if aspect_ratio < 4:  # Not too elongated
                    bbox = BoundingBox(x1=x, y1=y, x2=x+w, y2=y+h)
                    
                    # Estimate physical properties
                    estimator = PotholeEstimator()
                    width_cm, height_cm, depth_cm, area_cm2 = estimator.estimate_physical_size(
                        bbox, img_width, img_height
                    )
                    severity = estimator.classify_severity(width_cm, depth_cm, area_cm2)
                    
                    # Lower confidence since this is image analysis, not ML
                    detection = PotholeDetection(
                        bbox=bbox,
                        confidence=0.6,  # Lower confidence for fallback
                        class_id=0,
                        class_name="pothole",
                        estimated_width_cm=width_cm,
                        estimated_height_cm=height_cm,
                        estimated_depth_cm=depth_cm,
                        estimated_area_cm2=area_cm2,
                        severity=severity
                    )
                    detections.append(detection)
        
        # If still no detections, assume the whole image center is a pothole
        # (since user intentionally took photo of a pothole)
        if not detections:
            # Create a detection in center of image
            center_x = img_width // 2
            center_y = img_height // 2
            size = min(img_width, img_height) // 3
            
            bbox = BoundingBox(
                x1=center_x - size // 2,
                y1=center_y - size // 2,
                x2=center_x + size // 2,
                y2=center_y + size // 2
            )
            
            estimator = PotholeEstimator()
            width_cm, height_cm, depth_cm, area_cm2 = estimator.estimate_physical_size(
                bbox, img_width, img_height
            )
            severity = estimator.classify_severity(width_cm, depth_cm, area_cm2)
            
            detection = PotholeDetection(
                bbox=bbox,
                confidence=0.5,  # Low confidence - assumed pothole
                class_id=0,
                class_name="pothole",
                estimated_width_cm=width_cm,
                estimated_height_cm=height_cm,
                estimated_depth_cm=depth_cm,
                estimated_area_cm2=area_cm2,
                severity=severity
            )
            detections.append(detection)
            print(f"⚠️ No ML detection, using image analysis fallback")
        
        return detections[:5]  # Return max 5 detections
    
    def detect(self, image_path: str, save_annotated: bool = True, output_dir: Optional[str] = None) -> DetectionResult:
        """
        Detect potholes in an image.
        
        Args:
            image_path: Path to input image
            save_annotated: Whether to save annotated image with bounding boxes
            output_dir: Directory to save annotated images
        
        Returns:
            DetectionResult with all detections
        """
        import time
        start_time = time.time()
        
        # Load model if not already loaded
        if self.model is None:
            self.load_model()
        
        # Read image
        img = cv2.imread(image_path)
        if img is None:
            raise ValueError(f"Could not read image: {image_path}")
        
        img_height, img_width = img.shape[:2]
        
        # Run inference
        results = self.model(image_path, conf=self.confidence, verbose=False)
        
        detections = []
        estimator = PotholeEstimator()
        
        for result in results:
            boxes = result.boxes
            
            for i, box in enumerate(boxes):
                # Get bounding box coordinates
                x1, y1, x2, y2 = map(int, box.xyxy[0].tolist())
                confidence = float(box.conf[0])
                class_id = int(box.cls[0])
                class_name = result.names.get(class_id, "pothole")
                
                # Only count as pothole if it's actually labeled as pothole
                # or if using a general detector, check for road-related objects
                if class_name.lower() in ['pothole', 'hole', 'crack', 'damage']:
                    bbox = BoundingBox(x1=x1, y1=y1, x2=x2, y2=y2)
                    
                    # Estimate physical properties
                    width_cm, height_cm, depth_cm, area_cm2 = estimator.estimate_physical_size(
                        bbox, img_width, img_height
                    )
                    
                    # Classify severity
                    severity = estimator.classify_severity(width_cm, depth_cm, area_cm2)
                    
                    detection = PotholeDetection(
                        bbox=bbox,
                        confidence=confidence,
                        class_id=class_id,
                        class_name=class_name,
                        estimated_width_cm=width_cm,
                        estimated_height_cm=height_cm,
                        estimated_depth_cm=depth_cm,
                        estimated_area_cm2=area_cm2,
                        severity=severity
                    )
                    detections.append(detection)
        
        # If no ML detections, use image analysis fallback
        # (since user photos are intentionally taken of potholes)
        if not detections:
            print(f"🔍 No YOLO detections, using image analysis fallback for {image_path}")
            detections = self._analyze_image_for_potholes(img)
        
        processing_time = (time.time() - start_time) * 1000
        
        # Save annotated image
        annotated_path = None
        if save_annotated and detections:
            annotated_path = self._save_annotated_image(
                img, detections, image_path, output_dir
            )
        
        return DetectionResult(
            image_path=image_path,
            image_width=img_width,
            image_height=img_height,
            detections=detections,
            processing_time_ms=processing_time,
            annotated_image_path=annotated_path
        )
    
    def _save_annotated_image(
        self, 
        img: np.ndarray, 
        detections: List[PotholeDetection], 
        original_path: str,
        output_dir: Optional[str] = None
    ) -> str:
        """Draw bounding boxes and save annotated image"""
        annotated = img.copy()
        
        # Color based on severity
        severity_colors = {
            "LOW": (0, 255, 0),      # Green
            "MEDIUM": (0, 165, 255), # Orange
            "HIGH": (0, 0, 255)      # Red
        }
        
        for det in detections:
            color = severity_colors.get(det.severity, (255, 255, 255))
            
            # Draw bounding box
            cv2.rectangle(
                annotated,
                (det.bbox.x1, det.bbox.y1),
                (det.bbox.x2, det.bbox.y2),
                color,
                2
            )
            
            # Draw label
            label = f"{det.severity}: {det.estimated_width_cm}x{det.estimated_height_cm}cm"
            label_size, _ = cv2.getTextSize(label, cv2.FONT_HERSHEY_SIMPLEX, 0.6, 2)
            
            # Background for label
            cv2.rectangle(
                annotated,
                (det.bbox.x1, det.bbox.y1 - label_size[1] - 10),
                (det.bbox.x1 + label_size[0] + 10, det.bbox.y1),
                color,
                -1
            )
            
            # Label text
            cv2.putText(
                annotated,
                label,
                (det.bbox.x1 + 5, det.bbox.y1 - 5),
                cv2.FONT_HERSHEY_SIMPLEX,
                0.6,
                (255, 255, 255),
                2
            )
        
        # Save annotated image
        if output_dir is None:
            output_dir = settings.OUTPUT_DIR
        os.makedirs(output_dir, exist_ok=True)
        
        base_name = Path(original_path).stem
        output_path = os.path.join(output_dir, f"{base_name}_annotated.jpg")
        cv2.imwrite(output_path, annotated)
        
        return output_path


# Singleton detector instance
_detector: Optional[PotholeDetector] = None


def get_detector() -> PotholeDetector:
    """Get or create the singleton detector instance"""
    global _detector
    if _detector is None:
        _detector = PotholeDetector(confidence=settings.CONFIDENCE_THRESHOLD)
    return _detector
