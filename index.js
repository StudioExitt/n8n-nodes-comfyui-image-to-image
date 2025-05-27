module.exports = {
    packageName: 'n8n-nodes-comfyui-image-to-image',
    productionOnly: true,
    nodeTypes: {
        "n8n-nodes-comfyui-image-to-image": {
            nodePath: 'dist/nodes/ComfyUI/ComfyuiImageToImage.node.js',
            type: 'file',
        }
    },
    credentialTypes: {
        "n8n-nodes-comfyui-image-to-image": {
            credPath: 'dist/credentials/ComfyUIApi.credentials.js',
            type: 'file',
        }
    }
};
