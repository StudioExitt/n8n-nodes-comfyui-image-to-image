import {
	IExecuteFunctions,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
} from 'n8n-workflow';
import { NodeApiError } from 'n8n-workflow';
import FormData from 'form-data';

interface ComfyUINode {
	inputs: Record<string, any>;
	class_type: string;
	_meta?: {
		title: string;
	};
}

interface ComfyUIWorkflow {
	[key: string]: ComfyUINode;
}

interface ImageInfo {
	name: string;
	subfolder: string;
	type: string;
}

export class ComfyuiImageToImage implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'ComfyUI Image to Image',
		name: 'comfyuiImageToImage',
		icon: 'file:comfyui.svg',
		group: ['transform'],
		version: 1,
		description: 'Transform images using ComfyUI workflow',
		defaults: {
			name: 'ComfyUI Image to Image',
		},
		credentials: [
			{
				name: 'comfyUIApi',
				required: true,
			},
		],
		inputs: ['main'],
		outputs: ['main'],
		properties: [
			{
				displayName: 'Workflow JSON',
				name: 'workflow',
				type: 'string',
				typeOptions: {
					rows: 10,
				},
				default: '',
				required: true,
				description: 'The ComfyUI workflow in JSON format',
			},
			{
				displayName: 'Input Type',
				name: 'inputType',
				type: 'options',
				options: [
					{ name: 'URL', value: 'url' },
					{ name: 'Base64', value: 'base64' },
					{ name: 'Binary', value: 'binary' }
				],
				default: 'url',
				required: true,
			},
			{
				displayName: 'Input Image',
				name: 'inputImage',
				type: 'string',
				default: '',
				required: true,
				displayOptions: {
					show: {
						inputType: ['url', 'base64'],
					},
				},
				description: 'URL or base64 data of the input image',
			},
			{
				displayName: 'Binary Property',
				name: 'binaryPropertyName',
				type: 'string',
				default: 'data',
				required: true,
				displayOptions: {
					show: {
						inputType: ['binary'],
					},
				},
				description: 'Name of the binary property containing the image',
			},
			{
				displayName: 'Timeout',
				name: 'timeout',
				type: 'number',
				default: 30,
				description: 'Maximum time in minutes to wait for image generation',
			},
		],
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const credentials = await this.getCredentials('comfyUIApi');
		const workflow = this.getNodeParameter('workflow', 0) as string;
		const inputType = this.getNodeParameter('inputType', 0) as string;
		const timeout = this.getNodeParameter('timeout', 0) as number;

		const apiUrl = credentials.apiUrl as string;
		const apiKey = credentials.apiKey as string;

		console.log('[ComfyUI] Executing image transformation with API URL:', apiUrl);

		const headers: Record<string, string> = {
			'Content-Type': 'application/json',
		};

		if (apiKey) {
			console.log('[ComfyUI] Using API key authentication');
			headers['Authorization'] = `Bearer ${apiKey}`;
		}

		try {
			// Check API connection
			console.log('[ComfyUI] Checking API connection...');
			await this.helpers.request({
				method: 'GET',
				url: `${apiUrl}/system_stats`,
				headers,
				json: true,
			});

			// Prepare input image
			let imageBuffer: Buffer;
			
			if (inputType === 'url') {
				// Download image from URL
				const inputImage = this.getNodeParameter('inputImage', 0) as string;
				console.log('[ComfyUI] Downloading image from URL:', inputImage);
				const response = await this.helpers.request({
					method: 'GET',
					url: inputImage,
					encoding: null,
				});
				imageBuffer = Buffer.from(response);
			} else if (inputType === 'binary') {
				// Get binary data using helpers
				console.log('[ComfyUI] Getting binary data from input');
				
				// Get the binary property name
				const binaryPropertyName = this.getNodeParameter('binaryPropertyName', 0) as string;
				console.log('[ComfyUI] Looking for binary property:', binaryPropertyName);
				
				// Log available binary properties for debugging
				const items = this.getInputData();
				const binaryProperties = Object.keys(items[0].binary || {});
				console.log('[ComfyUI] Available binary properties:', binaryProperties);
				
				// Try to find the specified binary property
				let actualPropertyName = binaryPropertyName;
				
				if (!items[0].binary?.[binaryPropertyName]) {
					console.log(`[ComfyUI] Binary property "${binaryPropertyName}" not found, searching for alternatives...`);
					
					// Try to find any image property as fallback
					const imageProperty = binaryProperties.find(key => 
						items[0].binary![key].mimeType?.startsWith('image/')
					);
					
					if (imageProperty) {
						console.log(`[ComfyUI] Found alternative image property: "${imageProperty}"`);
						actualPropertyName = imageProperty;
					} else {
						throw new NodeApiError(this.getNode(), { 
							message: `No binary data found in property "${binaryPropertyName}" and no image alternatives found`
						});
					}
				}
				
				// Get binary data
				imageBuffer = await this.helpers.getBinaryDataBuffer(0, actualPropertyName);
				console.log('[ComfyUI] Got binary data, size:', imageBuffer.length, 'bytes');
				
				// Get mime type for validation
				const mimeType = items[0].binary![actualPropertyName].mimeType;
				console.log('[ComfyUI] Binary data mime type:', mimeType);
				
				// Validate it's an image
				if (!mimeType || !mimeType.startsWith('image/')) {
					throw new NodeApiError(this.getNode(), {
						message: `Invalid media type: ${mimeType}. Only images are supported.`
					});
				}
			} else {
				// Base64 input
				const inputImage = this.getNodeParameter('inputImage', 0) as string;
				imageBuffer = Buffer.from(inputImage, 'base64');
			}

			// Upload image to ComfyUI
			console.log('[ComfyUI] Uploading image...');
			const formData = new FormData();
			formData.append('image', imageBuffer, 'input.png');
			formData.append('subfolder', '');
			formData.append('overwrite', 'true');

			const uploadResponse = await this.helpers.request({
				method: 'POST',
				url: `${apiUrl}/upload/image`,
				headers: {
					...headers,
					...formData.getHeaders(),
				},
				body: formData,
			});

			const imageInfo = JSON.parse(uploadResponse) as ImageInfo;
			console.log('[ComfyUI] Image uploaded:', imageInfo);

			// Parse and modify workflow JSON
			let workflowData;
			try {
				workflowData = JSON.parse(workflow);
			} catch (error) {
				throw new NodeApiError(this.getNode(), { 
					message: 'Invalid workflow JSON. Please check the JSON syntax and try again.',
					description: error.message
				});
			}

			// Validate workflow structure
			if (typeof workflowData !== 'object' || workflowData === null) {
				throw new NodeApiError(this.getNode(), { 
					message: 'Invalid workflow structure. The workflow must be a valid JSON object.'
				});
			}

			// Find the LoadImage node and update its image data
			const loadImageNode = Object.values(workflowData as ComfyUIWorkflow).find((node: ComfyUINode) => 
				node.class_type === 'LoadImage' && node.inputs && node.inputs.image !== undefined
			);

			if (!loadImageNode) {
				throw new NodeApiError(this.getNode(), { 
					message: 'No LoadImage node found in the workflow. The workflow must contain a LoadImage node with an image input.'
				});
			}

			// Update the image input with the uploaded image info
			loadImageNode.inputs.image = imageInfo.name;

			// Queue image generation
			console.log('[ComfyUI] Queueing image generation...');
			const response = await this.helpers.request({
				method: 'POST',
				url: `${apiUrl}/prompt`,
				headers,
				body: {
					prompt: workflowData,
				},
				json: true,
			});

			if (!response.prompt_id) {
				throw new NodeApiError(this.getNode(), { message: 'Failed to get prompt ID from ComfyUI' });
			}

			const promptId = response.prompt_id;
			console.log('[ComfyUI] Image generation queued with ID:', promptId);

			// Poll for completion
			let attempts = 0;
			const maxAttempts = 60 * timeout; // Convert minutes to seconds
			await new Promise(resolve => setTimeout(resolve, 5000));
			while (attempts < maxAttempts) {
				console.log(`[ComfyUI] Checking image generation status (attempt ${attempts + 1}/${maxAttempts})...`);
				await new Promise(resolve => setTimeout(resolve, 1000));
				attempts++;

				const history = await this.helpers.request({
					method: 'GET',
					url: `${apiUrl}/history/${promptId}`,
					headers,
					json: true,
				});

				const promptResult = history[promptId];
				if (!promptResult) {
					console.log('[ComfyUI] Prompt not found in history');
					continue;
				}

				if (promptResult.status === undefined) {
					console.log('[ComfyUI] Execution status not found');
					continue;
				}

				if (promptResult.status?.completed) {
					console.log('[ComfyUI] Image generation completed');

					if (promptResult.status?.status_str === 'error') {
						throw new NodeApiError(this.getNode(), { message: '[ComfyUI] Image generation failed' });
					}

					// Check outputs structure
					console.log('[ComfyUI] Raw outputs structure:', JSON.stringify(promptResult.outputs, null, 2));
					
					// Get all images outputs
					const imageOutputs = Object.values(promptResult.outputs)
						.flatMap((nodeOutput: any) => nodeOutput.images || [])
						.filter((image: any) => image.type === 'output' || image.type === 'temp')
						.map((img: any) => ({
							...img,
							url: `${apiUrl}/view?filename=${img.filename}&subfolder=${img.subfolder || ''}&type=${img.type}`
						}));

					console.log('[ComfyUI] Found image outputs:', imageOutputs);

					if (imageOutputs.length === 0) {
						throw new NodeApiError(this.getNode(), { message: '[ComfyUI] No image outputs found in results' });
					}

					// Return the first image output
					const imageOutput = imageOutputs[0];
                    
                    const imageResponse = await this.helpers.request({
                        method: 'GET',
                        url: imageOutput.url,
                        encoding: null,
                        resolveWithFullResponse: true
                    });

                    if (imageResponse.statusCode === 404) {
                        throw new NodeApiError(this.getNode(), { message: `Image file not found at ${imageOutput.url}` });
                    }

                    console.log('[ComfyUI] Using media directly from ComfyUI');
                    const buffer = Buffer.from(imageResponse.body);
                    const base64Data = buffer.toString('base64');
                    const fileSize = Math.round(buffer.length / 1024 * 10) / 10 + " kB";

                    // Determine MIME type based on file extension
                    let mimeType = 'image/png';
                    let fileExtension = 'png';
                    
                    if (imageOutput.filename.endsWith('.jpg') || imageOutput.filename.endsWith('.jpeg')) {
                        mimeType = 'image/jpeg';
                        fileExtension = imageOutput.filename.endsWith('.jpg') ? 'jpg' : 'jpeg';
                    } else if (imageOutput.filename.endsWith('.webp')) {
                        mimeType = 'image/webp';
                        fileExtension = 'webp';
                    }

                    return [[{
                        json: {
                            mimeType,
                            fileName: imageOutput.filename,
                            data: base64Data,
                            status: promptResult.status,
                        },
                        binary: {
                            data: {
                                fileName: imageOutput.filename,
                                data: base64Data,
                                fileType: 'image',
                                fileSize,
                                fileExtension,
                                mimeType
                            }
                        }
                    }]];
				}
			}
			throw new NodeApiError(this.getNode(), { message: `Image generation timeout after ${timeout} minutes` });
		} catch (error) {
			console.error('[ComfyUI] Image generation error:', error);
			throw new NodeApiError(this.getNode(), { 
				message: `ComfyUI API Error: ${error.message}`,
				description: error.description || ''
			});
		}
	}
} 