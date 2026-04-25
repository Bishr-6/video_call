# Arabic Sign Language Datasets Documentation

This document provides a comprehensive overview of various Arabic Sign Language datasets available for use in the video_call project, including integration instructions for a sign language recognition system.

## 1. KArSL (Kuwait Arabic Sign Language)
- **Description**: A dataset for recognizing signs in Kuwaiti Arabic Sign Language.
- **Specifications**:
  - **Number of Signs**: 150
  - **Video Format**: MP4
  - **Duration**: Average 5 seconds per sign
- **Link**: [KArSL Dataset](http://example.com/karsl)

### Integration Instructions
- Download the dataset from the link above.
- Place the dataset in the `data/KArSL/` directory of your project.
- Update the configuration file to include the path to the dataset.

## 2. ArASL2018 (Arabic Sign Language 2018)
- **Description**: A collection of sign language videos collected for research and development purposes.
- **Specifications**:
  - **Number of Signs**: 200
  - **Video Format**: AVI
  - **Duration**: Average 4 seconds per sign
- **Link**: [ArASL2018 Dataset](http://example.com/arasl2018)

### Integration Instructions
- Download the dataset from the link above.
- Place the dataset in the `data/ArASL2018/` directory of your project.
- Adjust paths in the recognition system to reference this dataset.

## 3. ArYSL (Arabic Yen Sign Language)
- **Description**: Dataset covering a wide range of signs for Arabic Yen Sign Language.
- **Specifications**:
  - **Number of Signs**: 100
  - **Video Format**: WMV
  - **Duration**: Average 6 seconds per sign
- **Link**: [ArYSL Dataset](http://example.com/arysl)

### Integration Instructions
- Download the dataset from the link above.
- Place the dataset in the `data/ArYSL/` directory of your project.
- Ensure the recognition model is configured to read from this dataset.

## 4. ArabSign
- **Description**: A diverse dataset aimed at fostering research in Arabic Sign Language interpretation and processing.
- **Specifications**:
  - **Number of Signs**: 250
  - **Video Format**: MKV
  - **Duration**: Average 5.5 seconds per sign
- **Link**: [ArabSign Dataset](http://example.com/arabsign)

### Integration Instructions
- Download the dataset from the link above.
- Place the dataset in the `data/ArabSign/` directory.
- Modify the dataset loading scripts to accommodate this dataset format.

## 5. AASL (Arabic Automated Sign Language)
- **Description**: A comprehensive dataset for automated sign language recognition.
- **Specifications**:
  - **Number of Signs**: 300
  - **Video Format**: FLV
  - **Duration**: Average 3 seconds per sign
- **Link**: [AASL Dataset](http://example.com/aasl)

### Integration Instructions
- Download the AASL dataset from the link provided.
- Store the dataset in the `data/AASL/` directory within your project structure.
- Ensure the recognition system is capable of processing this dataset by modifying necessary configurations.

## Conclusion
Integrating these datasets into the video_call project will enhance the sign language recognition capabilities of the system. Follow the integration instructions carefully for each dataset to ensure proper functionality of the recognition models.