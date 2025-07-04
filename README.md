![Banner image](https://user-images.githubusercontent.com/10284570/173569848-c624317f-42b1-45a6-ab09-f0ea3c247648.png)

# n8n-nodes-comfyui-image-to-image

This package provides n8n node to integrate with [ComfyUI](https://github.com/comfyanonymous/ComfyUI) - A powerful and modular stable diffusion GUI with a graph/nodes interface.

## Features

- Execute ComfyUI workflows directly from n8n
- Transform images using stable diffusion models
- Support for workflow JSON import
- Automatic output retrieval from workflow outputs
- Progress monitoring and error handling
- Support for API key authentication
- Configurable timeout settings

## Prerequisites

- n8n (version 1.0.0 or later)
- ComfyUI instance running and accessible
- Node.js 16 or newer

## Installation

### Standard Installation

```bash
# Install from npm package (recommended)
npm install n8n-nodes-comfyui-image-to-image@1.0.0

# Or install from git repository
npm install github:StudioExitt/n8n-nodes-comfyui-image-to-image
```

### Docker Installation

For Docker installations, you can use one of the following methods:

#### Method 1: Volume Mount
```bash
# Create a directory for custom nodes
mkdir -p /path/to/custom/nodes

# Clone the repository
git clone https://github.com/StudioExitt/n8n-nodes-comfyui-image-to-image.git /tmp/custom-nodes
cd /tmp/custom-nodes

# Install dependencies and build
npm install
npm run build

# Copy the built files to your custom nodes directory
cp -r dist/* /path/to/custom/nodes/n8n-nodes-comfyui-image-to-image/

# Run n8n with the custom nodes directory mounted
docker run -d \
  --name n8n \
  -p 5678:5678 \
  -v /path/to/custom/nodes:/home/node/.n8n/custom/nodes \
  n8nio/n8n
```

#### Method 2: Custom Docker Image
```dockerfile
# Dockerfile
FROM n8nio/n8n

# Install the custom nodes package from GitHub
RUN cd /tmp && \
    npm install github:StudioExitt/n8n-nodes-comfyui-image-to-image && \
    cp -r /tmp/node_modules/n8n-nodes-comfyui-image-to-image /home/node/.n8n/custom/nodes/ && \
    chown -R node:node /home/node/.n8n
```

Build and run:
```bash
docker build -t n8n-with-comfyui .
docker run -d --name n8n -p 5678:5678 n8n-with-comfyui
```

#### Method 3: Docker Compose
```yaml
version: '3'

services:
  n8n:
    image: n8nio/n8n
    container_name: n8n
    ports:
      - "5678:5678"
    volumes:
      - n8n_data:/home/node/.n8n
      - ./custom-nodes:/home/node/.n8n/custom/nodes
    environment:
      - N8N_PORT=5678
      - N8N_PROTOCOL=http
      - NODE_ENV=production

volumes:
  n8n_data:
```

Then:
```bash
# Clone the repository
git clone https://github.com/StudioExitt/n8n-nodes-comfyui-image-to-image.git /tmp/custom-nodes
cd /tmp/custom-nodes

# Install dependencies and build
npm install
npm run build

# Copy the built files to your custom nodes directory
mkdir -p ./custom-nodes/n8n-nodes-comfyui-image-to-image
cp -r dist/* ./custom-nodes/n8n-nodes-comfyui-image-to-image/

# Start the docker-compose setup
docker-compose up -d
```

## Node Types

### ComfyUI Image to Image Node

This node allows you to convert images using ComfyUI's image-to-image capabilities.

#### Settings

- **API URL**: The URL of your ComfyUI instance (default: http://127.0.0.1:8188)
- **API Key**: Optional API key if authentication is enabled
- **Workflow JSON**: The ComfyUI workflow in JSON format for image transformation
- **Input Type**: Choose between URL, Base64, or Binary input methods
- **Input Image**: URL or base64 string of the input image (when using URL or Base64 input type)
- **Binary Property**: Name of the binary property containing the image (when using Binary input type)
- **Timeout**: Maximum time in minutes to wait for image transformation

#### Input

The node accepts an image input in three ways:
1. **URL**: Provide a direct URL to an image
2. **Base64**: Provide a base64-encoded image string
3. **Binary**: Use an image from a binary property in the workflow (e.g., from an HTTP Request node)

#### Outputs

The node outputs the transformed image:
- In the `binary.data` property with proper MIME type and file information
- `fileName`: Name of the transformed image file
- `data`: Base64 encoded image data
- `fileType`: The type of image file (e.g., 'image')
- `fileSize`: Size of the image in KB
- `fileExtension`: File extension (png, jpg, webp)
- `mimeType`: MIME type of the image

## Usage Examples

### Using the ComfyUI Image to Image Node

1. Create a workflow in ComfyUI for image transformation (e.g., img2img, inpainting, style transfer)
2. Export the workflow as JSON (API)
3. Add the ComfyUI Image to Image node
4. Paste your workflow JSON
5. Select the appropriate Input Type:
   - For URL: Enter the image URL
   - For Base64: Provide a base64 string
   - For Binary: Specify the binary property containing the image (default: "data")
6. Configure timeout as needed
7. Execute the workflow to generate a transformed image from your input image

## Error Handling

The node includes comprehensive error handling for:
- API connection issues
- Invalid workflow JSON
- Execution failures
- Timeout conditions
- Input image validation

## Development

```bash
# Install dependencies
npm install

# Build
npm run build

# Test
npm run test

# Lint
npm run lint
```

## License

[MIT](LICENSE.md)

---

# 한국어 문서

## n8n-nodes-comfyui-image-to-image

이 패키지는 [ComfyUI](https://github.com/comfyanonymous/ComfyUI)와 통합하는 n8n 노드를 제공합니다 - 그래프/노드 인터페이스가 있는 강력하고 모듈식 안정적인 확산 GUI입니다.

## 기능

- n8n에서 직접 ComfyUI 워크플로우 실행
- 안정적인 확산 모델을 사용하여 이미지 및 비디오 생성
- 워크플로우 JSON 가져오기 지원
- 워크플로우 출력에서 자동 출력 검색
- 진행 모니터링 및 오류 처리
- API 키 인증 지원
- 구성 가능한 타임아웃 설정

## 사전 요구 사항

- n8n (버전 1.0.0 이상)
- ComfyUI 인스턴스가 실행 중이고 접근 가능
- Node.js 16 이상

## 설치

### 표준 설치

```bash
# Install from npm package (recommended)
npm install n8n-nodes-comfyui-image-to-image@1.0.0

# Or install from git repository
npm install github:StudioExitt/n8n-nodes-comfyui-image-to-image
```

### 도커 설치

도커 설치의 경우 다음 방법 중 하나를 사용할 수 있습니다:

#### 방법 1: 볼륨 마운트
```bash
# 커스텀 노드를 위한 디렉토리 생성
mkdir -p /path/to/custom/nodes

# 저장소 복제
git clone https://github.com/StudioExitt/n8n-nodes-comfyui-image-to-image.git /tmp/custom-nodes
cd /tmp/custom-nodes

# 의존성 설치 및 빌드
npm install
npm run build

# 빌드된 파일을 커스텀 노드 디렉토리로 복사
cp -r dist/* /path/to/custom/nodes/n8n-nodes-comfyui-image-to-image/

# 커스텀 노드 디렉토리를 마운트하여 n8n 실행
docker run -d \
  --name n8n \
  -p 5678:5678 \
  -v /path/to/custom/nodes:/home/node/.n8n/custom/nodes \
  n8nio/n8n
```

#### 방법 2: 커스텀 도커 이미지
```dockerfile
# Dockerfile
FROM n8nio/n8n

# GitHub에서 커스텀 노드 패키지 설치
RUN cd /tmp && \
    npm install github:StudioExitt/n8n-nodes-comfyui-image-to-image && \
    cp -r /tmp/node_modules/n8n-nodes-comfyui-image-to-image /home/node/.n8n/custom/nodes/ && \
    chown -R node:node /home/node/.n8n
```

빌드 및 실행:
```bash
docker build -t n8n-with-comfyui .
docker run -d --name n8n -p 5678:5678 n8n-with-comfyui
```

#### 방법 3: 도커 컴포즈
```yaml
version: '3'

services:
  n8n:
    image: n8nio/n8n
    container_name: n8n
    ports:
      - "5678:5678"
    volumes:
      - n8n_data:/home/node/.n8n
      - ./custom-nodes:/home/node/.n8n/custom/nodes
    environment:
      - N8N_PORT=5678
      - N8N_PROTOCOL=http
      - NODE_ENV=production

volumes:
  n8n_data:
```

그리고:
```bash
# 저장소 복제
git clone https://github.com/StudioExitt/n8n-nodes-comfyui-image-to-image.git /tmp/custom-nodes
cd /tmp/custom-nodes

# 의존성 설치 및 빌드
npm install
npm run build

# 빌드된 파일을 커스텀 노드 디렉토리로 복사
mkdir -p ./custom-nodes/n8n-nodes-comfyui-image-to-image
cp -r dist/* ./custom-nodes/n8n-nodes-comfyui-image-to-image/

# 도커 컴포즈 설정 시작
docker-compose up -d
```

## 노드 유형

### ComfyUI Image to Image Node

이 노드를 사용하면 ComfyUI의 이미지-이미지 변환 기능을 사용하여 이미지를 변환하거나 개선할 수 있습니다.

## 사용 예제

### ComfyUI Image to Image Node 사용하기

1. ComfyUI에서 이미지 변환을 위한 워크플로우 생성(예: img2img, inpainting, style transfer)
2. 워크플로우를 JSON으로 내보내기(API)
3. ComfyUI Image to Image node 추가
4. 워크플로우 JSON 붙여넣기
5. 적절한 입력 유형 선택:
   - For URL: Enter the image URL
   - For Base64: Provide a base64 string
   - For Binary: Specify the binary property containing the image (default: "data")
6. 필요에 따라 타임아웃 구성
7. 워크플로우를 실행하여 입력 이미지에서 변환된 이미지 생성 