"""
HEIC Image Processing Module
Handles HEIC to JPEG conversion and EXIF/GPS data extraction
"""
import io
import os
from dataclasses import dataclass
from datetime import datetime
from pathlib import Path
from typing import Optional, Tuple

import exifread
from PIL import Image
from pillow_heif import register_heif_opener

# Register HEIF opener with PIL
register_heif_opener()


@dataclass
class GPSData:
    """GPS coordinates extracted from image EXIF data"""
    latitude: float
    longitude: float
    altitude: Optional[float] = None
    timestamp: Optional[datetime] = None
    
    def to_dict(self):
        return {
            "latitude": self.latitude,
            "longitude": self.longitude,
            "altitude": self.altitude,
            "timestamp": self.timestamp.isoformat() if self.timestamp else None
        }


@dataclass
class ImageMetadata:
    """Complete image metadata"""
    gps: Optional[GPSData]
    capture_date: Optional[datetime]
    device_make: Optional[str]
    device_model: Optional[str]
    original_filename: str
    
    def to_dict(self):
        return {
            "gps": self.gps.to_dict() if self.gps else None,
            "capture_date": self.capture_date.isoformat() if self.capture_date else None,
            "device_make": self.device_make,
            "device_model": self.device_model,
            "original_filename": self.original_filename
        }


def convert_to_degrees(value) -> float:
    """
    Convert GPS coordinates from EXIF format to decimal degrees.
    EXIF stores GPS as [degrees, minutes, seconds] as Rational values.
    """
    try:
        d = float(value.values[0].num) / float(value.values[0].den)
        m = float(value.values[1].num) / float(value.values[1].den)
        s = float(value.values[2].num) / float(value.values[2].den)
        return d + (m / 60.0) + (s / 3600.0)
    except (AttributeError, IndexError, ZeroDivisionError):
        return 0.0


def extract_gps_from_exif(tags: dict) -> Optional[GPSData]:
    """Extract GPS coordinates from EXIF tags"""
    try:
        # Check if GPS data exists
        if "GPS GPSLatitude" not in tags or "GPS GPSLongitude" not in tags:
            return None
        
        lat = convert_to_degrees(tags["GPS GPSLatitude"])
        lon = convert_to_degrees(tags["GPS GPSLongitude"])
        
        # Apply hemisphere reference
        if "GPS GPSLatitudeRef" in tags:
            if str(tags["GPS GPSLatitudeRef"]) == "S":
                lat = -lat
        
        if "GPS GPSLongitudeRef" in tags:
            if str(tags["GPS GPSLongitudeRef"]) == "W":
                lon = -lon
        
        # Extract altitude if available
        altitude = None
        if "GPS GPSAltitude" in tags:
            try:
                alt_val = tags["GPS GPSAltitude"].values[0]
                altitude = float(alt_val.num) / float(alt_val.den)
                if "GPS GPSAltitudeRef" in tags and str(tags["GPS GPSAltitudeRef"]) == "1":
                    altitude = -altitude
            except:
                pass
        
        # Extract GPS timestamp
        timestamp = None
        if "GPS GPSDate" in tags and "GPS GPSTimeStamp" in tags:
            try:
                date_str = str(tags["GPS GPSDate"])
                time_vals = tags["GPS GPSTimeStamp"].values
                hour = int(time_vals[0].num / time_vals[0].den)
                minute = int(time_vals[1].num / time_vals[1].den)
                second = int(time_vals[2].num / time_vals[2].den)
                timestamp = datetime.strptime(f"{date_str} {hour}:{minute}:{second}", "%Y:%m:%d %H:%M:%S")
            except:
                pass
        
        return GPSData(
            latitude=lat,
            longitude=lon,
            altitude=altitude,
            timestamp=timestamp
        )
    
    except Exception as e:
        print(f"Error extracting GPS data: {e}")
        return None


def extract_metadata(image_path: str) -> ImageMetadata:
    """Extract all metadata from an image file (HEIC or other formats)"""
    original_filename = os.path.basename(image_path)
    
    try:
        with open(image_path, 'rb') as f:
            tags = exifread.process_file(f, details=False)
        
        # Extract GPS data
        gps = extract_gps_from_exif(tags)
        
        # Extract capture date
        capture_date = None
        for date_tag in ["EXIF DateTimeOriginal", "EXIF DateTimeDigitized", "Image DateTime"]:
            if date_tag in tags:
                try:
                    date_str = str(tags[date_tag])
                    capture_date = datetime.strptime(date_str, "%Y:%m:%d %H:%M:%S")
                    break
                except:
                    continue
        
        # Extract device info
        device_make = str(tags.get("Image Make", "")) or None
        device_model = str(tags.get("Image Model", "")) or None
        
        return ImageMetadata(
            gps=gps,
            capture_date=capture_date,
            device_make=device_make.strip() if device_make else None,
            device_model=device_model.strip() if device_model else None,
            original_filename=original_filename
        )
    
    except Exception as e:
        print(f"Error extracting metadata from {image_path}: {e}")
        return ImageMetadata(
            gps=None,
            capture_date=None,
            device_make=None,
            device_model=None,
            original_filename=original_filename
        )


def convert_heic_to_jpeg(heic_path: str, output_dir: str) -> Tuple[str, bool]:
    """
    Convert HEIC image to JPEG format for YOLOv8 processing.
    Returns tuple of (output_path, success)
    """
    try:
        # Create output directory if needed
        os.makedirs(output_dir, exist_ok=True)
        
        # Generate output filename
        base_name = Path(heic_path).stem
        output_path = os.path.join(output_dir, f"{base_name}.jpg")
        
        # Open and convert HEIC to JPEG
        with Image.open(heic_path) as img:
            # Convert to RGB if necessary (HEIC might be RGBA)
            if img.mode in ("RGBA", "P"):
                img = img.convert("RGB")
            
            # Save as JPEG with high quality
            img.save(output_path, "JPEG", quality=95, optimize=True)
        
        print(f"Converted {heic_path} -> {output_path}")
        return output_path, True
    
    except Exception as e:
        print(f"Error converting {heic_path} to JPEG: {e}")
        return "", False


def get_image_dimensions(image_path: str) -> Tuple[int, int]:
    """Get image width and height"""
    try:
        with Image.open(image_path) as img:
            return img.size
    except:
        return 0, 0


def process_heic_image(heic_path: str, output_dir: str) -> Tuple[Optional[str], Optional[ImageMetadata]]:
    """
    Process a HEIC image: extract metadata and convert to JPEG.
    Returns tuple of (jpeg_path, metadata)
    """
    # Extract metadata first (before conversion to preserve EXIF)
    metadata = extract_metadata(heic_path)
    
    # Convert to JPEG
    jpeg_path, success = convert_heic_to_jpeg(heic_path, output_dir)
    
    if success:
        return jpeg_path, metadata
    return None, metadata
