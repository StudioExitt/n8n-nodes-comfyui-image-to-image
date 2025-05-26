@echo off
echo === ComfyUI Image Transformations 노드 설치 스크립트 ===
echo 이 스크립트는 n8n에 ComfyUI 이미지 변환 노드를 설치합니다.
echo.

echo 1. 필요한 디렉토리 생성 중...
mkdir custom-nodes\n8n-nodes-comfyui-image-transformations 2>nul

echo 2. 의존성 설치 중...
call npm install

echo 3. 노드 패키지 빌드 중...
call npm run build

echo 4. 빌드된 파일 복사 중...
xcopy /E /I /Y dist\* custom-nodes\n8n-nodes-comfyui-image-transformations\

echo 5. 설치 완료!
echo.
echo 다음 명령어로 n8n을 시작할 수 있습니다:
echo docker-compose up -d
echo.
echo 웹 브라우저에서 다음 주소로 접속하세요:
echo n8n: http://localhost:5678
echo ComfyUI: http://localhost:8188
echo.
echo GitHub에서 최신 버전을 받으려면:
echo git pull origin main
echo 그 후 이 스크립트를 다시 실행하세요.

pause 