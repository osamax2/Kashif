# Kashif Pothole Detection Service

YOLOv8-basierter Pothole-Erkennungsdienst für automatische Berichterstellung.

## Features

- 📷 **HEIC-Unterstützung**: Verarbeitet iPhone HEIC-Bilder direkt
- 🗺️ **GPS-Extraktion**: Extrahiert GPS-Koordinaten aus EXIF-Daten
- 🔍 **YOLOv8-Erkennung**: Erkennt Schlaglöcher mit Deep Learning
- 📏 **Größenschätzung**: Schätzt Breite, Höhe und Tiefe
- ⚠️ **Schweregrad**: Klassifiziert als LOW, MEDIUM oder HIGH
- 📝 **Auto-Reports**: Erstellt automatisch Berichte im Reporting-Service

## Architektur

```
┌─────────────────────────────────────────────────────────────┐
│                    HEIC Image Input                          │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│  1. HEIC Processing                                          │
│     - Convert HEIC → JPEG                                    │
│     - Extract EXIF/GPS metadata                              │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│  2. YOLOv8 Detection                                         │
│     - Load trained model                                     │
│     - Detect potholes with bounding boxes                    │
│     - Calculate confidence scores                            │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│  3. Size/Depth Estimation                                    │
│     - Estimate physical dimensions (cm)                      │
│     - Estimate depth based on size/shape                     │
│     - Classify severity (LOW/MEDIUM/HIGH)                    │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│  4. Report Generation                                        │
│     - Create report with GPS coordinates                     │
│     - Include size/depth estimates                           │
│     - Upload to Reporting Service API                        │
└─────────────────────────────────────────────────────────────┘
```

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/` | GET | Health check |
| `/detect` | POST | Upload image and detect potholes |
| `/process-directory` | POST | Process all images in directory |
| `/pending` | GET | List pending images |
| `/output/{filename}` | GET | Download annotated image |
| `/stats` | GET | Get processing statistics |
| `/load-model` | POST | Manually load model |

## Usage

### Via Docker Compose

```bash
cd Backend
docker-compose up -d pothole-detection
```

### Via API

```bash
# Upload and detect
curl -X POST "http://localhost:8006/detect" \
  -F "file=@image.heic" \
  -F "create_report=true"

# Process directory
curl -X POST "http://localhost:8006/process-directory?create_reports=true"
```

### Local Processing

```bash
cd pothole-detection-service
pip install -r requirements.txt
python processor.py ../images/
```

## Response Example

```json
{
  "success": true,
  "message": "Detected 2 pothole(s)",
  "num_potholes": 2,
  "max_severity": "MEDIUM",
  "detections": [
    {
      "bbox": {"x1": 100, "y1": 200, "x2": 300, "y2": 400, "width": 200, "height": 200},
      "confidence": 0.85,
      "estimated_width_cm": 25.0,
      "estimated_height_cm": 25.0,
      "estimated_depth_cm": 7.5,
      "estimated_area_cm2": 490.9,
      "severity": "MEDIUM"
    }
  ],
  "gps": {
    "latitude": 33.3152,
    "longitude": 44.3661,
    "altitude": 35.0
  },
  "report_id": 42,
  "processing_time_ms": 450.5
}
```

## Training Custom Model

1. Download pothole dataset from Roboflow:
   https://universe.roboflow.com/pothole-detection

2. Prepare dataset structure:
   ```
   dataset/
   ├── train/images/
   ├── train/labels/
   ├── valid/images/
   ├── valid/labels/
   └── data.yaml
   ```

3. Train model:
   ```bash
   python train_model.py --dataset dataset/data.yaml --epochs 100
   ```

4. Copy trained model:
   ```bash
   cp models/pothole_model.pt /path/to/deployment/
   ```

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `IMAGES_DIR` | `/app/images` | Input images directory |
| `PROCESSED_DIR` | `/app/processed` | Processed images directory |
| `OUTPUT_DIR` | `/app/output` | Annotated images output |
| `MODEL_PATH` | `/app/models/pothole_model.pt` | Trained model path |
| `CONFIDENCE_THRESHOLD` | `0.5` | Detection confidence threshold |
| `ADMIN_USER_ID` | `1` | User ID for auto-reports |
| `REPORTING_SERVICE_URL` | `http://localhost:8003` | Reporting service URL |

## Severity Classification

| Severity | Width (cm) | Depth (cm) | Risk |
|----------|------------|------------|------|
| LOW | < 15 | < 3 | Cosmetic damage |
| MEDIUM | 15-30 | 3-7 | Tire damage |
| HIGH | > 30 | > 7 | Vehicle damage, safety hazard |

## References

- [YOLOv8 Pothole Detection](https://github.com/mounishvatti/pothole_detection_yolov8)
- [Ultralytics YOLOv8](https://github.com/ultralytics/ultralytics)
- [Roboflow Pothole Datasets](https://universe.roboflow.com/pothole-detection)
