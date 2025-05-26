#!/bin/bash

# 색상 코드
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}=== ComfyUI Image Transformations 노드 설치 스크립트 ===${NC}"
echo -e "${YELLOW}이 스크립트는 n8n에 ComfyUI 이미지 변환 노드를 설치합니다.${NC}"
echo ""

# 디렉토리 생성
echo -e "${GREEN}1. 필요한 디렉토리 생성 중...${NC}"
mkdir -p custom-nodes/n8n-nodes-comfyui-image-transformations

# 의존성 설치
echo -e "${GREEN}2. 의존성 설치 중...${NC}"
npm install

# 프로젝트 빌드
echo -e "${GREEN}3. 노드 패키지 빌드 중...${NC}"
npm run build

# 빌드 결과 복사
echo -e "${GREEN}4. 빌드된 파일 복사 중...${NC}"
cp -r dist/* custom-nodes/n8n-nodes-comfyui-image-transformations/

echo -e "${GREEN}5. 설치 완료!${NC}"
echo ""
echo -e "${YELLOW}다음 명령어로 n8n을 시작할 수 있습니다:${NC}"
echo -e "docker-compose up -d"
echo ""
echo -e "${YELLOW}웹 브라우저에서 다음 주소로 접속하세요:${NC}"
echo -e "n8n: http://localhost:5678"
echo -e "ComfyUI: http://localhost:8188"
echo ""
echo -e "${YELLOW}GitHub에서 최신 버전을 받으려면:${NC}"
echo -e "git pull origin main"
echo -e "${YELLOW}그 후 이 스크립트를 다시 실행하세요.${NC}" 