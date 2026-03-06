"""
Smart Detection Filter for Pothole Detection
Filters false positives: shadows, reference objects, non-pothole dark areas.
Uses texture analysis, color variance, and depth validation.
"""
import cv2
import numpy as np
from typing import List, Optional, Tuple
from dataclasses import dataclass


@dataclass
class FilterResult:
    """Result of filtering a single detection"""
    is_pothole: bool
    reason: str
    texture_score: float = 0.0
    color_variance: float = 0.0
    edge_density: float = 0.0
    depth_variance: float = 0.0
    overall_score: float = 0.0


class DetectionFilter:
    """
    Filters false positive pothole detections using multiple heuristics:
    
    1. Texture Analysis: Real potholes have rough texture (high variance).
       Shadows and flat objects (cards) have smooth/uniform appearance.
    
    2. Edge Density: Potholes have visible edges from cracks, surface damage.
       Shadows have few internal edges.
    
    3. Color Variance: Potholes show varied colors (broken asphalt, dirt, etc).
       Shadows are uniformly dark.
    
    4. Depth Validation: If a depth map is available, verify the detected
       region has actual depression (depth variation).
    
    5. Aspect Ratio / Shape: Rectangular objects like cards are not potholes.
    """
    
    # Thresholds (tuned for road pothole detection)
    MIN_TEXTURE_SCORE = 15.0      # Minimum grayscale standard deviation
    MIN_EDGE_DENSITY = 0.03       # Minimum fraction of edge pixels
    MIN_COLOR_VARIANCE = 10.0     # Minimum color channel variance
    MIN_DEPTH_VARIANCE = 0.02     # Minimum depth map variance (normalized)
    MIN_OVERALL_SCORE = 0.35      # Minimum combined score to pass filter
    
    # Size filters
    MAX_AREA_FRACTION = 0.10      # Detections covering >10% of image are not potholes
    EDGE_PROXIMITY_PX = 15        # Detection starting within 15px of image edge
    
    # Reference object detection (credit card, phone)
    CARD_ASPECT_RATIO_MIN = 1.4   # Credit card is ~1.586 (85.6/54)
    CARD_ASPECT_RATIO_MAX = 1.8
    CARD_MAX_AREA_FRACTION = 0.08 # Card shouldn't be more than 8% of image
    
    def __init__(
        self,
        min_confidence: float = 0.40,
        min_texture: float = None,
        min_edge_density: float = None,
        min_overall_score: float = None
    ):
        self.min_confidence = min_confidence
        self.min_texture = min_texture or self.MIN_TEXTURE_SCORE
        self.min_edge_density = min_edge_density or self.MIN_EDGE_DENSITY
        self.min_overall_score = min_overall_score or self.MIN_OVERALL_SCORE
    
    def filter_detections(
        self,
        image: np.ndarray,
        detections: list,
        depth_map: Optional[np.ndarray] = None
    ) -> Tuple[list, list]:
        """
        Filter detections, returning (kept, removed) lists.
        
        Args:
            image: Original BGR image
            detections: List of PotholeDetection objects
            depth_map: Optional normalized depth map (0-1 range)
        
        Returns:
            Tuple of (valid_detections, rejected_detections)
        """
        if not detections:
            return [], []
        
        valid = []
        rejected = []
        
        img_h, img_w = image.shape[:2]
        img_area = img_h * img_w
        
        # Pre-compute edge map for the whole image
        gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
        edges = cv2.Canny(gray, 50, 150)
        
        for det in detections:
            result = self._evaluate_detection(
                image, gray, edges, det, img_w, img_h, img_area, depth_map
            )
            
            if result.is_pothole:
                valid.append(det)
                print(f"   ✅ Kept: conf={det.confidence:.2f}, "
                      f"texture={result.texture_score:.1f}, "
                      f"edges={result.edge_density:.3f}, "
                      f"color_var={result.color_variance:.1f}, "
                      f"score={result.overall_score:.2f}")
            else:
                rejected.append(det)
                print(f"   ❌ Rejected ({result.reason}): conf={det.confidence:.2f}, "
                      f"texture={result.texture_score:.1f}, "
                      f"edges={result.edge_density:.3f}, "
                      f"color_var={result.color_variance:.1f}, "
                      f"score={result.overall_score:.2f}")
        
        return valid, rejected
    
    def _evaluate_detection(
        self,
        image: np.ndarray,
        gray: np.ndarray,
        edges: np.ndarray,
        detection,
        img_w: int,
        img_h: int,
        img_area: int,
        depth_map: Optional[np.ndarray]
    ) -> FilterResult:
        """Evaluate a single detection using multiple heuristics."""
        bbox = detection.bbox
        
        # Clamp bbox to image bounds
        x1 = max(0, bbox.x1)
        y1 = max(0, bbox.y1)
        x2 = min(img_w, bbox.x2)
        y2 = min(img_h, bbox.y2)
        
        if x2 <= x1 or y2 <= y1:
            return FilterResult(
                is_pothole=False,
                reason="invalid_bbox"
            )
        
        # Extract ROI (region of interest)
        roi_color = image[y1:y2, x1:x2]
        roi_gray = gray[y1:y2, x1:x2]
        roi_edges = edges[y1:y2, x1:x2]
        
        # Pre-compute area fraction
        bbox_area_fraction = bbox.area / img_area
        aspect = max(bbox.width, bbox.height) / max(min(bbox.width, bbox.height), 1)
        
        # 1. Confidence check
        if detection.confidence < self.min_confidence:
            return FilterResult(
                is_pothole=False,
                reason=f"low_confidence ({detection.confidence:.2f} < {self.min_confidence})"
            )
        
        # 1b. Maximum area check - single potholes don't cover >10% of image
        if bbox_area_fraction > self.MAX_AREA_FRACTION:
            return FilterResult(
                is_pothole=False,
                reason=f"too_large ({bbox_area_fraction:.1%} of image, max={self.MAX_AREA_FRACTION:.0%})"
            )
        
        # 1c. Edge proximity check - detections anchored at image corners/edges
        # are usually artifacts, not real potholes
        edges_touched = 0
        if bbox.x1 < self.EDGE_PROXIMITY_PX:
            edges_touched += 1
        if bbox.y1 < self.EDGE_PROXIMITY_PX:
            edges_touched += 1
        if bbox.x2 > img_w - self.EDGE_PROXIMITY_PX:
            edges_touched += 1
        if bbox.y2 > img_h - self.EDGE_PROXIMITY_PX:
            edges_touched += 1
        
        if edges_touched >= 2:
            return FilterResult(
                is_pothole=False,
                reason=f"corner_detection (touches {edges_touched} image edges)"
            )
        
        # 2. Reference object check (credit card shape)
        if (self.CARD_ASPECT_RATIO_MIN <= aspect <= self.CARD_ASPECT_RATIO_MAX
                and bbox_area_fraction < self.CARD_MAX_AREA_FRACTION):
            # Check if it also has very uniform color (like a card)
            color_std = np.std(roi_color, axis=(0, 1)).mean()
            if color_std < 40:  # Very uniform → likely a card/flat object
                return FilterResult(
                    is_pothole=False,
                    reason=f"reference_object (aspect={aspect:.2f}, color_std={color_std:.1f})",
                    color_variance=float(color_std)
                )
        
        # 3. Texture analysis (grayscale standard deviation)
        texture_score = float(np.std(roi_gray))
        
        # 4. Edge density (fraction of edge pixels in ROI)
        roi_pixels = max((x2 - x1) * (y2 - y1), 1)
        edge_density = float(np.count_nonzero(roi_edges)) / roi_pixels
        
        # 5. Color variance (average std across channels)
        color_variance = float(np.std(roi_color, axis=(0, 1)).mean())
        
        # 6. Depth validation (if depth map available)
        depth_variance = 0.0
        depth_score = 0.5  # Neutral if no depth map
        
        if depth_map is not None:
            depth_variance = self._check_depth_variation(
                depth_map, x1, y1, x2, y2, img_w, img_h
            )
            # Depth variance > 0.02 means actual depression exists
            if depth_variance < self.MIN_DEPTH_VARIANCE:
                depth_score = 0.1  # Flat region → unlikely pothole
            else:
                depth_score = min(1.0, depth_variance / 0.10)  # Scale 0-1
        
        # 7. Shadow detection
        is_shadow = self._is_likely_shadow(roi_color, roi_gray, texture_score, edge_density)
        
        # Calculate overall score
        # Weight: confidence (30%), texture (20%), edges (15%), color (15%), depth (20%)
        # If shadow detected, apply heavy penalty
        confidence_norm = min(1.0, detection.confidence / 0.8)
        texture_norm = min(1.0, texture_score / 50.0)
        edge_norm = min(1.0, edge_density / 0.10)
        color_norm = min(1.0, color_variance / 40.0)
        
        overall_score = (
            0.30 * confidence_norm +
            0.20 * texture_norm +
            0.15 * edge_norm +
            0.15 * color_norm +
            0.20 * depth_score
        )
        
        # Shadow penalty
        if is_shadow:
            overall_score *= 0.3
        
        is_valid = overall_score >= self.min_overall_score
        
        reason = "passed" if is_valid else "low_score"
        if is_shadow and not is_valid:
            reason = "shadow_detected"
        
        return FilterResult(
            is_pothole=is_valid,
            reason=reason,
            texture_score=texture_score,
            color_variance=color_variance,
            edge_density=edge_density,
            depth_variance=depth_variance,
            overall_score=overall_score
        )
    
    def _is_likely_shadow(
        self,
        roi_color: np.ndarray,
        roi_gray: np.ndarray,
        texture_score: float,
        edge_density: float
    ) -> bool:
        """
        Detect if the ROI is a shadow rather than a pothole.
        
        Shadows characteristics:
        - Uniformly dark (low texture/variance)
        - Low saturation (no color shift, just darker)
        - Few internal edges
        - Consistent brightness without sharp depth transitions
        """
        if roi_color.size == 0 or roi_gray.size == 0:
            return False
        
        # Convert to HSV for saturation check
        roi_hsv = cv2.cvtColor(roi_color, cv2.COLOR_BGR2HSV)
        mean_saturation = np.mean(roi_hsv[:, :, 1])
        mean_brightness = np.mean(roi_hsv[:, :, 2])
        
        # Shadow indicators (accumulate points)
        shadow_indicators = 0
        
        # Low texture (smooth/uniform area)
        if texture_score < self.min_texture:
            shadow_indicators += 1
        
        # Low edge density (no cracks or surface damage)
        if edge_density < self.min_edge_density:
            shadow_indicators += 1
        
        # Low saturation AND dark (shadows desaturate the underlying surface)
        if mean_saturation < 40 and mean_brightness < 100:
            shadow_indicators += 1
        
        # Very uniform brightness (shadow = uniformly dimmed)
        brightness_std = np.std(roi_gray)
        if brightness_std < 15:
            shadow_indicators += 1
        
        # Check if the region is mostly just "darker than surroundings"
        # by comparing center vs. edges
        h, w = roi_gray.shape[:2]
        if h > 10 and w > 10:
            center_region = roi_gray[h//4:3*h//4, w//4:3*w//4]
            center_mean = np.mean(center_region)
            overall_mean = np.mean(roi_gray)
            # Shadows have very similar center vs edge brightness
            if abs(center_mean - overall_mean) < 5:
                shadow_indicators += 1
        
        # 3 or more indicators = likely shadow
        return shadow_indicators >= 3
    
    def _check_depth_variation(
        self,
        depth_map: np.ndarray,
        x1: int, y1: int, x2: int, y2: int,
        img_w: int, img_h: int
    ) -> float:
        """
        Check if the depth map shows actual depth variation in the region.
        
        A real pothole will show a depression (higher depth values).
        Shadows and flat objects show no depth variation.
        
        Returns: depth variance (0-1 range)
        """
        if depth_map is None or depth_map.size == 0:
            return 0.0
        
        depth_h, depth_w = depth_map.shape[:2]
        
        # Scale bbox to depth map coordinates
        scale_x = depth_w / img_w
        scale_y = depth_h / img_h
        
        dx1 = int(x1 * scale_x)
        dy1 = int(y1 * scale_y)
        dx2 = int(x2 * scale_x)
        dy2 = int(y2 * scale_y)
        
        # Clamp
        dx1 = max(0, dx1)
        dy1 = max(0, dy1)
        dx2 = min(depth_w, dx2)
        dy2 = min(depth_h, dy2)
        
        if dx2 <= dx1 or dy2 <= dy1:
            return 0.0
        
        roi_depth = depth_map[dy1:dy2, dx1:dx2]
        
        if roi_depth.size == 0:
            return 0.0
        
        # Calculate depth variance within the region
        depth_variance = float(np.std(roi_depth))
        
        # Also check: region median depth vs. surrounding area depth
        # Get surrounding context (expanded bbox)
        margin = max(dx2 - dx1, dy2 - dy1) // 2
        sx1 = max(0, dx1 - margin)
        sy1 = max(0, dy1 - margin)
        sx2 = min(depth_w, dx2 + margin)
        sy2 = min(depth_h, dy2 + margin)
        
        surround_depth = depth_map[sy1:sy2, sx1:sx2]
        
        if surround_depth.size > 0:
            region_median = np.median(roi_depth)
            surround_median = np.median(surround_depth)
            depth_diff = abs(float(region_median) - float(surround_median))
            
            # Combine variance and depth difference
            depth_variance = max(depth_variance, depth_diff)
        
        return depth_variance
