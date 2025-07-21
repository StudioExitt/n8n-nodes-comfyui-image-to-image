# ComfyUI Image to Video 노드 가이드

## 개요

이 가이드는 두 개의 입력 이미지로부터 영상을 생성하는 새로운 `ComfyUI Image to Video` 노드의 사용법을 설명합니다.

## 필요한 ComfyUI 확장 프로그램

영상 생성을 위해서는 다음 확장 프로그램 중 하나 이상이 ComfyUI에 설치되어 있어야 합니다:

### 1. AnimateDiff
```bash
cd ComfyUI/custom_nodes
git clone https://github.com/Kosinkadink/ComfyUI-AnimateDiff-Evolved.git
```

### 2. Stable Video Diffusion (SVD)
```bash
cd ComfyUI/custom_nodes  
git clone https://github.com/Stability-AI/generative-models.git
```

### 3. Video Helper Suite (VHS)
```bash
cd ComfyUI/custom_nodes
git clone https://github.com/Kosinkadink/ComfyUI-VideoHelperSuite.git
```

## 워크플로우 설정

### 기본 워크플로우 구조

영상 생성 워크플로우는 다음 요소들을 포함해야 합니다:

1. **두 개의 LoadImage 노드** - 각각 특정 ID를 가져야 함
2. **모델 로더** - CheckpointLoaderSimple, VAELoader
3. **텍스트 인코딩** - CLIPTextEncode (positive/negative prompts)
4. **영상 생성 노드** - AnimateDiff, SVD 등
5. **영상 출력 노드** - VHS_VideoCombine, SaveVideo 등

### 예제 워크플로우 (AnimateDiff 기반)

```json
{
  "load_image_1": {
    "inputs": {
      "image": "first_input.png"
    },
    "class_type": "LoadImage",
    "_meta": {
      "title": "Load First Image"
    }
  },
  "load_image_2": {
    "inputs": {
      "image": "second_input.png"
    },
    "class_type": "LoadImage",
    "_meta": {
      "title": "Load Second Image"
    }
  },
  "animatediff_sampler": {
    "inputs": {
      "model": ["checkpoint_loader", 0],
      "positive": ["positive_prompt", 0],
      "negative": ["negative_prompt", 0],
      "latent_image": ["latent_interpolate", 0],
      "frame_count": 16,
      "fps": 8,
      "denoise": 0.75
    },
    "class_type": "AnimateDiffSampler"
  },
  "video_combine": {
    "inputs": {
      "images": ["vae_decode", 0],
      "frame_rate": 8,
      "format": "video/mp4"
    },
    "class_type": "VHS_VideoCombine"
  }
}
```

## 노드 설정 방법

### 1. 워크플로우 준비
- ComfyUI에서 영상 생성 워크플로우를 설계
- 두 개의 LoadImage 노드의 ID를 `load_image_1`, `load_image_2`로 설정 (또는 다른 고유 ID)
- 워크플로우를 JSON (API) 형식으로 내보내기

### 2. n8n에서 노드 설정
1. `ComfyUI Image to Video` 노드를 워크플로우에 추가
2. **기본 설정:**
   - **API URL**: ComfyUI 서버 주소 (예: `http://localhost:8188`)
   - **API Key**: 필요시 API 키 입력
   - **Workflow JSON**: 내보낸 워크플로우 JSON 붙여넣기

3. **이미지 입력 설정:**
   - **First Image Input Type**: URL, Base64, 또는 Binary 선택
   - **First Image**: 첫 번째 이미지 URL 또는 Base64 데이터
   - **First Image Binary Property**: Binary 타입 선택시 속성명 (기본: `data`)
   - **Second Image Input Type**: 두 번째 이미지 입력 방식
   - **Second Image**: 두 번째 이미지 URL 또는 Base64 데이터
   - **Second Image Binary Property**: Binary 타입 선택시 속성명 (기본: `data2`)

4. **워크플로우 노드 ID 설정:**
   - **First Image Node ID**: 첫 번째 LoadImage 노드의 ID (기본: `load_image_1`)
   - **Second Image Node ID**: 두 번째 LoadImage 노드의 ID (기본: `load_image_2`)

5. **영상 설정:**
   - **Video Frame Count**: 생성할 프레임 수 (기본: 16)
   - **Video Frame Rate**: 프레임 속도/FPS (기본: 8)
   - **Timeout**: 타임아웃 시간(분) (기본: 60분)

## 지원되는 영상 형식

- **MP4** (`video/mp4`)
- **WebM** (`video/webm`)
- **GIF** (`image/gif`)
- **MOV** (`video/quicktime`)

## 출력 데이터 구조

노드는 다음과 같은 구조로 데이터를 출력합니다:

```json
{
  "json": {
    "mimeType": "video/mp4",
    "fileName": "generated_video.mp4",
    "data": "base64_encoded_video_data",
    "status": { "completed": true },
    "frameCount": 16,
    "frameRate": 8,
    "duration": 2.0
  },
  "binary": {
    "data": {
      "fileName": "generated_video.mp4",
      "data": "base64_encoded_video_data",
      "fileType": "video",
      "fileSize": "1.2 MB",
      "fileExtension": "mp4",
      "mimeType": "video/mp4"
    }
  }
}
```

## 일반적인 문제 해결

### 1. "No LoadImage node found" 오류
- 워크플로우의 LoadImage 노드 ID가 설정된 ID와 일치하는지 확인
- 노드 ID는 대소문자를 구분함

### 2. "No video outputs found" 오류
- ComfyUI 워크플로우에 영상 출력 노드 (VHS_VideoCombine 등)가 포함되어 있는지 확인
- 영상 확장 프로그램이 올바르게 설치되었는지 확인

### 3. 타임아웃 오류
- 영상 생성은 이미지 생성보다 오래 걸리므로 타임아웃을 60분 이상으로 설정
- 프레임 수를 줄여서 생성 시간 단축

### 4. Binary 입력 오류
- 이전 노드에서 올바른 이미지 바이너리 데이터가 전달되는지 확인
- Binary Property 이름이 정확한지 확인

## 예제 사용 사례

### 1. 이미지 모핑 영상
두 개의 서로 다른 이미지 사이의 부드러운 전환 영상 생성

### 2. 스타일 변화 애니메이션
같은 피사체의 다른 스타일 버전들 간의 애니메이션

### 3. 시간 경과 시뮬레이션
같은 장면의 다른 시간대 이미지들로 시간 흐름 표현

## 성능 최적화 팁

1. **프레임 수 조절**: 긴 영상보다는 16-24 프레임으로 시작
2. **해상도 조절**: 너무 높은 해상도는 생성 시간을 크게 증가시킴
3. **모델 선택**: 빠른 모델 (예: SD 1.5 기반)부터 시작
4. **워크플로우 최적화**: 불필요한 노드들 제거

## 추가 리소스

- [ComfyUI 공식 문서](https://github.com/comfyanonymous/ComfyUI)
- [AnimateDiff 가이드](https://github.com/Kosinkadink/ComfyUI-AnimateDiff-Evolved)
- [Video Helper Suite 사용법](https://github.com/Kosinkadink/ComfyUI-VideoHelperSuite)
- [예제 워크플로우](./image_to_video_example.json) 