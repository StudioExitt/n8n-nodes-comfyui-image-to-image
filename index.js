module.exports = {
    packageName: 'n8n-nodes-comfyui-image-to-image',
    productionOnly: true,
    nodeTypes: {
        "comfyuiImageToImage": {
            nodePath: 'dist/nodes/ComfyUI/ComfyuiImageToImage.node.js',
            type: 'file',
        },
        "comfyuiDualImageToImage": {
            nodePath: 'dist/nodes/ComfyUI/ComfyuiDualImageToImage.node.js',
            type: 'file',
        },
        "comfyuiImageToVideo": {
            nodePath: 'dist/nodes/ComfyUI/ComfyuiImageToVideo.node.js',
            type: 'file',
        },
        "comfyuiAudioGenerator": {
            nodePath: 'dist/nodes/ComfyUI/ComfyuiAudioGenerator.node.js',
            type: 'file',
        }
    },
    credentialTypes: {
        "comfyUIApi": {
            credPath: 'dist/credentials/ComfyUIApi.credentials.js',
            type: 'file',
        }
    }
};
