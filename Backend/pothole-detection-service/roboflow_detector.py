"""
Roboflow Pothole Detection Module
Uses Roboflow's pretrained YOLOv8 model for pothole detection
Model: https://universe.roboflow.com/kartik-zvust/pothole-detection-yolo-v8
"""
import os
import base64
import requests
from dataclasses import dataclass
from pathlib import Path
from typing import List, Optional, Tuple

import cv2
import numpy as np

from config import settings
from detection_filter import DetectionFilter


# Roboflow API Configuration
ROBOFLOW_API_KEY = os.getenv("ROBOFLOW_API_KEY", "Pb3G6QRYMasm5Ax5e10S")
ROBOFLOW_MODEL_ID = os.getenv("ROBOFLOW_MODEL_ID", "pothole-clzln/1")
ROBOFLOW_API_URL = "https://detect.roboflow.com"


@dataclass
class BoundingBox:
    """Bounding box for detected pothole"""
    x1: int
    y1: int
    x2: int
    y2: int
    
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
    estimated_width_cm: Optional[float] = None
    estimated_height_cm: Optional[float] = None
    estimated_depth_cm: Optional[float] = None
    estimated_area_cm2: Optional[float] = None
    severity: Optional[str] = None
    
    def to_dict(self):
        def _float(v):
            if v is None:
                return None
            if hasattr(v, 'item'):
                return float(v.item())
            return float(v)
        
        return {
            "bbox": {
                "x1": int(self.bbox.x1),
                "y1": int(self.bbox.y1),
                "x2": int(self.bbox.x2),
                "y2": int(self.bbox.y2),
                "width": int(self.bbox.width),
                "height": int(self.bbox.height),
                "area_pixels": int(self.bbox.area)
            },
            "confidence": round(_float(self.confidence), 4),
            "class_id": int(self.class_id),
            "class_name": self.class_name,
            "estimated_width_cm": round(_float(self.estimated_width_cm), 1) if self.estimated_width_cm else None,
            "estimated_height_cm": round(_float(self.estimated_height_cm), 1) if self.estimated_height_cm else None,
            "estimated_depth_cm": round(_float(self.estimated_depth_cm), 1) if self.estimated_depth_cm else None,
            "estimated_area_cm2": round(_float(self.estimated_area_cm2), 1) if self.estimated_area_cm2 else None,
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
    detection_method: str = "roboflow"
    
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
            "detection_method": self.detection_method,
            "annotated_image_path": self.annotated_image_path,
            "detections": [d.to_dict() for d in self.detections]
        }


class PotholeEstimator:
    """Estimates physical properties of potholes"""
    
    PIXELS_PER_CM_ESTIMATE = 8.0
    DEPTH_RATIO = 0.3
    
    @staticmethod
    def estimate_physical_size(bbox: BoundingBox, image_width: int, image_height: int) -> Tuple[float, float, float, float]:
        scale_factor = image_width / 4032
        adjusted_ppcm = PotholeEstimator.PIXELS_PER_CM_ESTIMATE * scale_factor
        
        width_cm = bbox.width / adjusted_ppcm
        height_cm = bbox.height / adjusted_ppcm
        
        avg_size = (width_cm + height_cm) / 2
        depth_cm = avg_size * PotholeEstimator.DEPTH_RATIO
        
        aspect_ratio = max(width_cm, height_cm) / max(min(width_cm, height_cm), 1)
        if aspect_ratio > 2:
            depth_cm *= 1.2
        elif aspect_ratio < 1.3:
            depth_cm *= 0.8
        
        area_cm2 = width_cm * height_cm * 0.785
        
        return (
            round(width_cm, 1),
            round(height_cm, 1),
            round(depth_cm, 1),
            round(area_cm2, 1)
        )
    
    @staticmethod
    def classify_severity(width_cm: float, depth_cm: float, area_cm2: float) -> str:
        score = 0
        
        if width_cm < 15:
            score += 1
        elif width_cm < 30:
            score += 2
        else:
            score += 3
        
        if depth_cm < 3:
            score += 1
        elif depth_cm < 7:
            score += 2
        else:
            score += 3
        
        if area_cm2 < 200:
            score += 1
        elif area_cm2 < 700:
            score += 2
        else:
            score += 3
        
        if score <= 4:
            return "LOW"
        elif score <= 7:
            return "MEDIUM"
        else:
            return "HIGH"


class RoboflowPotholeDetector:
    """
    Pothole detector using Roboflow's pretrained model.
    Falls back to local image analysis if API is unavailable.
    """
    
    def __init__(self, api_key: str = None, confidence: float = 0.40):
        self.api_key = api_key or ROBOFLOW_API_KEY
        self.confidence = confidence
        self.detection_filter = DetectionFilter(min_confidence=confidence)
        self.model_id = ROBOFLOW_MODEL_ID
        self.api_url = ROBOFLOW_API_URL
        self.use_roboflow = bool(self.api_key)
        
        if self.use_roboflow:
            print(f"✅ Roboflow API configured - using model: {self.model_id}")
        else:
            print(f"⚠️ No Roboflow API key - will use local image analysis")
    
    def detect(
        self,
        image_path: str,
        save_annotated: bool = True,
        output_dir: Optional[str] = None
    ) -> DetectionResult:
        """Detect potholes in an image using Roboflow + texture analysis"""
        import time
        start_time = time.time()
        
        # Read image
        img = cv2.imread(image_path)
        if img is None:
            raise ValueError(f"Could not read image: {image_path}")
        
        img_height, img_width = img.shape[:2]
        
        # Step 1: Try Roboflow API
        roboflow_detections = []
        if self.use_roboflow:
            roboflow_detections = self._detect_with_roboflow(image_path, img_width, img_height)
            method = "roboflow"
        else:
            method = "local"
        
        # Step 2: Always run texture-based analysis as supplementary source
        texture_detections = self._detect_texture_anomalies(img)
        if texture_detections:
            print(f"🔎 Texture analysis found {len(texture_detections)} candidate region(s)")
        
        # Step 3: Merge detections (Roboflow first, add non-overlapping texture detections)
        detections = list(roboflow_detections)
        for tex_det in texture_detections:
            overlaps = False
            for existing in detections:
                if self._detection_iou(tex_det.bbox, existing.bbox) > 0.15:
                    overlaps = True
                    break
            if not overlaps:
                detections.append(tex_det)
                if method == "roboflow":
                    method = "roboflow+texture"
        
        if detections:
            print(f"📊 Merged detections: {len(roboflow_detections)} Roboflow + "
                  f"{len(detections) - len(roboflow_detections)} texture = {len(detections)} total")
        
        # Step 4: Fallback to basic local analysis if nothing found
        if not detections:
            print(f"🔍 Using basic local image analysis fallback")
            detections = self._analyze_image_locally(img)
            method = "local_analysis"
        
        # Step 5: Apply smart filtering to remove false positives
        if detections:
            print(f"🧠 Running smart filter on {len(detections)} detection(s)...")
            valid, rejected = self.detection_filter.filter_detections(img, detections)
            if rejected:
                print(f"🚫 Filtered out {len(rejected)} false positive(s)")
            detections = valid
        
        processing_time = (time.time() - start_time) * 1000
        
        # Step 6: Save annotated image with ONLY valid detections
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
            annotated_image_path=annotated_path,
            detection_method=method
        )
    
    def _detect_with_roboflow(
        self, 
        image_path: str, 
        img_width: int, 
        img_height: int
    ) -> List[PotholeDetection]:
        """Use Roboflow Model Inference API for detection"""
        try:
            # Read image and resize if too large (max 1280px on longest side)
            img = cv2.imread(image_path)
            if img is None:
                print(f"❌ Could not read image: {image_path}")
                return []
            
            # Resize if image is too large (Roboflow has 5MB limit)
            max_dim = 1280
            h, w = img.shape[:2]
            if max(h, w) > max_dim:
                scale = max_dim / max(h, w)
                new_w, new_h = int(w * scale), int(h * scale)
                img = cv2.resize(img, (new_w, new_h), interpolation=cv2.INTER_AREA)
                print(f"📐 Resized image from {w}x{h} to {new_w}x{new_h}")
            
            # Encode resized image to JPEG with quality 85
            _, buffer = cv2.imencode('.jpg', img, [cv2.IMWRITE_JPEG_QUALITY, 85])
            image_data = base64.b64encode(buffer).decode("utf-8")
            
            # Build Model Inference API URL
            # Format: https://detect.roboflow.com/{model_id}?api_key=...&confidence=...
            inference_url = f"{self.api_url}/{self.model_id}"
            
            # Call Roboflow Model Inference API with base64 image in body
            import time as api_time
            api_time.sleep(0.5)  # Small delay to avoid rate limiting
            
            response = requests.post(
                inference_url,
                params={
                    "api_key": self.api_key,
                    "confidence": self.confidence
                },
                data=image_data,
                headers={"Content-Type": "application/x-www-form-urlencoded"},
                timeout=60
            )
            
            if response.status_code != 200:
                print(f"❌ Roboflow API error: {response.status_code} - {response.text[:200]}")
                print(f"   URL: {inference_url}")
                print(f"   Image size: {len(image_data)} bytes")
                return []
            
            result = response.json()
            
            # Extract predictions directly from response
            predictions = result.get("predictions", [])
            
            # Scale predictions back to original image size if we resized
            if max(img_height, img_width) > max_dim:
                scale = max(img_height, img_width) / max_dim
                for pred in predictions:
                    pred["x"] = pred.get("x", 0) * scale
                    pred["y"] = pred.get("y", 0) * scale
                    pred["width"] = pred.get("width", 0) * scale
                    pred["height"] = pred.get("height", 0) * scale
            
            print(f"📡 Roboflow detected {len(predictions)} pothole(s)")
            
            detections = []
            estimator = PotholeEstimator()
            
            for pred in predictions:
                # Convert center coordinates to corner coordinates
                x_center = pred.get("x", 0)
                y_center = pred.get("y", 0)
                width = pred.get("width", 0)
                height = pred.get("height", 0)
                
                x1 = int(x_center - width / 2)
                y1 = int(y_center - height / 2)
                x2 = int(x_center + width / 2)
                y2 = int(y_center + height / 2)
                
                bbox = BoundingBox(x1=x1, y1=y1, x2=x2, y2=y2)
                
                # Estimate physical properties
                width_cm, height_cm, depth_cm, area_cm2 = estimator.estimate_physical_size(
                    bbox, img_width, img_height
                )
                severity = estimator.classify_severity(width_cm, depth_cm, area_cm2)
                
                detection = PotholeDetection(
                    bbox=bbox,
                    confidence=pred.get("confidence", 0),
                    class_id=0,
                    class_name=pred.get("class", "pothole"),
                    estimated_width_cm=width_cm,
                    estimated_height_cm=height_cm,
                    estimated_depth_cm=depth_cm,
                    estimated_area_cm2=area_cm2,
                    severity=severity
                )
                detections.append(detection)
            
            return detections
            
        except Exception as e:
            print(f"❌ Roboflow API exception: {e}")
            return []
    
    def _analyze_image_locally(self, img: np.ndarray) -> List[PotholeDetection]:
        """Fallback: analyze image locally for dark regions"""
        detections = []
        img_height, img_width = img.shape[:2]
        
        # Convert to grayscale
        gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
        blurred = cv2.GaussianBlur(gray, (5, 5), 0)
        
        # Threshold for dark regions (raised from 60 to avoid shadow false positives)
        _, thresh = cv2.threshold(blurred, 80, 255, cv2.THRESH_BINARY_INV)
        
        # Find contours
        contours, _ = cv2.findContours(thresh, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
        
        min_area = (img_width * img_height) * 0.005
        max_area = (img_width * img_height) * 0.5
        
        estimator = PotholeEstimator()
        
        for contour in contours:
            area = cv2.contourArea(contour)
            if min_area < area < max_area:
                x, y, w, h = cv2.boundingRect(contour)
                aspect_ratio = max(w, h) / max(min(w, h), 1)
                
                if aspect_ratio < 4:
                    bbox = BoundingBox(x1=x, y1=y, x2=x+w, y2=y+h)
                    width_cm, height_cm, depth_cm, area_cm2 = estimator.estimate_physical_size(
                        bbox, img_width, img_height
                    )
                    severity = estimator.classify_severity(width_cm, depth_cm, area_cm2)
                    
                    detection = PotholeDetection(
                        bbox=bbox,
                        confidence=0.6,
                        class_id=0,
                        class_name="pothole",
                        estimated_width_cm=width_cm,
                        estimated_height_cm=height_cm,
                        estimated_depth_cm=depth_cm,
                        estimated_area_cm2=area_cm2,
                        severity=severity
                    )
                    detections.append(detection)
        
        # No fallback - if nothing detected locally, return empty
        # (Removed: fake center-of-image pothole assumption)
        
        return detections[:5]
    
    def _detect_texture_anomalies(self, img: np.ndarray) -> List[PotholeDetection]:
        """
        Supplementary detection: find potholes via texture/color anomalies.
        
        Detects potholes that Roboflow may miss, especially:
        - Debris-filled potholes (not dark holes)
        - Shallow potholes with exposed aggregate
        - Potholes with different texture than surrounding pavement
        
        Uses: local texture variance, edge density, Lab color difference from pavement.
        """
        h, w = img.shape[:2]
        gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
        
        # Adaptive block size (roughly 1/25 of image size)
        block_size = max(max(h, w) // 25, 15)
        
        # 1. Local texture map (standard deviation in sliding window)
        gray_f = gray.astype(np.float64)
        local_mean = cv2.blur(gray_f, (block_size, block_size))
        local_sqr_mean = cv2.blur(gray_f ** 2, (block_size, block_size))
        texture_map = np.sqrt(np.maximum(local_sqr_mean - local_mean ** 2, 0))
        
        # 2. Edge density map
        edges_canny = cv2.Canny(gray, 30, 100)
        edge_density = cv2.blur(edges_canny.astype(np.float32) / 255.0, (block_size, block_size))
        
        # 3. Color difference from estimated pavement (using Lab color space)
        lab = cv2.cvtColor(img, cv2.COLOR_BGR2Lab)
        border_h = max(int(h * 0.12), 10)
        border_w = max(int(w * 0.12), 10)
        border_pixels = np.concatenate([
            lab[:border_h, :].reshape(-1, 3),
            lab[-border_h:, :].reshape(-1, 3),
            lab[:, :border_w].reshape(-1, 3),
            lab[:, -border_w:].reshape(-1, 3),
        ])
        pavement_lab = np.median(border_pixels.astype(np.float64), axis=0)
        color_diff = np.sqrt(np.sum((lab.astype(np.float64) - pavement_lab) ** 2, axis=2))
        color_diff_smooth = cv2.blur(color_diff, (block_size, block_size))
        
        # 4. Normalize each feature to [0, 1]
        def _normalize(arr):
            mn, mx = float(arr.min()), float(arr.max())
            if mx - mn < 1e-6:
                return np.zeros_like(arr)
            return (arr - mn) / (mx - mn)
        
        texture_norm = _normalize(texture_map)
        edge_norm = _normalize(edge_density)
        color_norm = _normalize(color_diff_smooth)
        
        # 5. Combine into damage probability map
        damage_map = texture_norm * 0.35 + edge_norm * 0.30 + color_norm * 0.35
        
        # 6. Adaptive threshold (only highly anomalous areas)
        mean_d = float(np.mean(damage_map))
        std_d = float(np.std(damage_map))
        threshold = mean_d + 1.8 * std_d  # Strict: only clearly damaged areas
        
        binary = (damage_map > threshold).astype(np.uint8) * 255
        
        # 7. Morphological cleanup
        morph_k = max(block_size // 3, 5)
        kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (morph_k, morph_k))
        binary = cv2.morphologyEx(binary, cv2.MORPH_CLOSE, kernel)
        binary = cv2.morphologyEx(binary, cv2.MORPH_OPEN, kernel)
        # Extra erosion to tighten boundaries around actual damage
        erode_k = max(morph_k // 2, 3)
        erode_kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (erode_k, erode_k))
        binary = cv2.erode(binary, erode_kernel, iterations=1)
        
        # 8. Find contours
        contours, _ = cv2.findContours(binary, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
        
        min_area = (w * h) * 0.003  # At least 0.3% of image
        max_area = (w * h) * 0.10   # At most 10% of image
        margin = min(w, h) * 0.03
        
        detections = []
        estimator = PotholeEstimator()
        
        for contour in contours:
            area = cv2.contourArea(contour)
            if min_area < area < max_area:
                x, y, cw, ch = cv2.boundingRect(contour)
                
                # Skip edge artifacts (must not touch image borders)
                if x < margin or y < margin or x + cw > w - margin or y + ch > h - margin:
                    continue
                
                aspect = max(cw, ch) / max(min(cw, ch), 1)
                if aspect > 3.5:  # Too elongated
                    continue
                
                # Skip regions with high color saturation (reference objects like colored cards)
                roi_hsv = cv2.cvtColor(img[y:y+ch, x:x+cw], cv2.COLOR_BGR2HSV)
                high_sat_frac = float(np.mean(roi_hsv[:, :, 1] > 100))
                if high_sat_frac > 0.10:  # >10% highly saturated pixels → likely a colored object
                    continue
                
                # Confidence from region damage score
                region_damage = float(np.mean(damage_map[y:y+ch, x:x+cw]))
                conf = min(0.70, max(0.30, region_damage * 2.0))
                
                bbox = BoundingBox(x1=x, y1=y, x2=x+cw, y2=y+ch)
                width_cm, height_cm, depth_cm, area_cm2 = estimator.estimate_physical_size(
                    bbox, w, h
                )
                severity = estimator.classify_severity(width_cm, depth_cm, area_cm2)
                
                detection = PotholeDetection(
                    bbox=bbox,
                    confidence=conf,
                    class_id=0,
                    class_name="pothole",
                    estimated_width_cm=width_cm,
                    estimated_height_cm=height_cm,
                    estimated_depth_cm=depth_cm,
                    estimated_area_cm2=area_cm2,
                    severity=severity
                )
                detections.append(detection)
        
        # Sort by confidence descending, return top 3
        detections.sort(key=lambda d: d.confidence, reverse=True)
        return detections[:3]
    
    @staticmethod
    def _detection_iou(bbox1: 'BoundingBox', bbox2: 'BoundingBox') -> float:
        """Calculate Intersection over Union between two bounding boxes."""
        x1 = max(bbox1.x1, bbox2.x1)
        y1 = max(bbox1.y1, bbox2.y1)
        x2 = min(bbox1.x2, bbox2.x2)
        y2 = min(bbox1.y2, bbox2.y2)
        
        if x2 <= x1 or y2 <= y1:
            return 0.0
        
        intersection = (x2 - x1) * (y2 - y1)
        union = bbox1.area + bbox2.area - intersection
        return intersection / max(union, 1)
    
    def _save_annotated_image(
        self,
        img: np.ndarray,
        detections: List[PotholeDetection],
        original_path: str,
        output_dir: Optional[str]
    ) -> Optional[str]:
        """Save image with bounding boxes drawn"""
        try:
            annotated = img.copy()
            
            for det in detections:
                color = (0, 0, 255) if det.severity == "HIGH" else \
                        (0, 165, 255) if det.severity == "MEDIUM" else (0, 255, 0)
                
                cv2.rectangle(
                    annotated,
                    (det.bbox.x1, det.bbox.y1),
                    (det.bbox.x2, det.bbox.y2),
                    color, 3
                )
                
                label = f"{det.class_name} {det.confidence:.0%}"
                if det.estimated_width_cm:
                    label += f" {det.estimated_width_cm}x{det.estimated_height_cm}cm"
                
                cv2.putText(
                    annotated, label,
                    (det.bbox.x1, det.bbox.y1 - 10),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.7, color, 2
                )
            
            if output_dir is None:
                output_dir = settings.OUTPUT_DIR
            
            os.makedirs(output_dir, exist_ok=True)
            filename = Path(original_path).stem + "_annotated.jpg"
            output_path = os.path.join(output_dir, filename)
            cv2.imwrite(output_path, annotated)
            
            return output_path
            
        except Exception as e:
            print(f"Error saving annotated image: {e}")
            return None
