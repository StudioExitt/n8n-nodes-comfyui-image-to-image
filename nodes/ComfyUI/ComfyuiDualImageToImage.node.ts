import {
	IExecuteFunctions,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
	NodeConnectionType,
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

export class ComfyuiDualImageToImage implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'ComfyUI Dual Image Transformer',
		name: 'comfyuiDualImageToImage',
		icon: 'file:comfyui.svg',
		group: ['transform'],
		version: 1,
		description: '🖼️+🖼️ Transform two input images into one output image using ComfyUI workflows (image blending, comparison, fusion)',
		defaults: {
			name: 'ComfyUI Dual Image Transformer',
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
				description: 'The ComfyUI workflow in JSON format (must contain two LoadImage nodes)',
			},
			{
				displayName: 'First Image Input Type',
				name: 'firstInputType',
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
				displayName: 'First Input Image',
				name: 'firstInputImage',
				type: 'string',
				default: '',
				required: true,
				displayOptions: {
					show: {
						firstInputType: ['url', 'base64'],
					},
				},
				description: 'URL or base64 data of the first input image',
			},
			{
				displayName: 'First Image Binary Property',
				name: 'firstBinaryPropertyName',
				type: 'string',
				default: 'data',
				required: true,
				displayOptions: {
					show: {
						firstInputType: ['binary'],
					},
				},
				description: 'Name of the binary property containing the first image',
			},
			{
				displayName: 'Second Image Input Type',
				name: 'secondInputType',
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
				displayName: 'Second Input Image',
				name: 'secondInputImage',
				type: 'string',
				default: '',
				required: true,
				displayOptions: {
					show: {
						secondInputType: ['url', 'base64'],
					},
				},
				description: 'URL or base64 data of the second input image',
			},
			{
				displayName: 'Second Image Binary Property',
				name: 'secondBinaryPropertyName',
				type: 'string',
				default: 'data2',
				required: true,
				displayOptions: {
					show: {
						secondInputType: ['binary'],
					},
				},
				description: 'Name of the binary property containing the second image',
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
		const firstInputType = this.getNodeParameter('firstInputType', 0) as string;
		const secondInputType = this.getNodeParameter('secondInputType', 0) as string;
		const timeout = this.getNodeParameter('timeout', 0) as number;

		const apiUrl = credentials.apiUrl as string;
		const apiKey = credentials.apiKey as string;

		console.log('[ComfyUI Dual] Executing dual image transformation with API URL:', apiUrl);

		const headers: Record<string, string> = {
			'Content-Type': 'application/json',
		};

		if (apiKey) {
			console.log('[ComfyUI Dual] Using API key authentication');
			headers['Authorization'] = `Bearer ${apiKey}`;
		}

		try {
			// Check API connection
			console.log('[ComfyUI Dual] Checking API connection...');
			await this.helpers.request({
				method: 'GET',
				url: `${apiUrl}/system_stats`,
				headers,
				json: true,
			});

			// Prepare first image
			let firstImageBuffer: Buffer;
			if (firstInputType === 'url') {
				const firstInputImage = this.getNodeParameter('firstInputImage', 0) as string;
				console.log('[ComfyUI Dual] Downloading first image from URL:', firstInputImage);
				const response = await this.helpers.request({
					method: 'GET',
					url: firstInputImage,
					encoding: null,
				});
				firstImageBuffer = Buffer.from(response);
			} else if (firstInputType === 'binary') {
				console.log('[ComfyUI Dual] Getting first binary data from input');
				const firstBinaryPropertyName = this.getNodeParameter('firstBinaryPropertyName', 0) as string;
				console.log('[ComfyUI Dual] Looking for first binary property:', firstBinaryPropertyName);
				
				const items = this.getInputData();
				const binaryProperties = Object.keys(items[0].binary || {});
				console.log('[ComfyUI Dual] Available binary properties:', binaryProperties);
				
				let actualFirstPropertyName = firstBinaryPropertyName;
				
				if (!items[0].binary?.[firstBinaryPropertyName]) {
					console.log(`[ComfyUI Dual] Binary property "${firstBinaryPropertyName}" not found, searching for alternatives...`);
					
					const imageProperty = binaryProperties.find(key => 
						items[0].binary![key].mimeType?.startsWith('image/')
					);
					
					if (imageProperty) {
						console.log(`[ComfyUI Dual] Found alternative first image property: "${imageProperty}"`);
						actualFirstPropertyName = imageProperty;
					} else {
						throw new NodeApiError(this.getNode(), { 
							message: `No binary data found in property "${firstBinaryPropertyName}" and no image alternatives found for first image`
						});
					}
				}
				
				firstImageBuffer = await this.helpers.getBinaryDataBuffer(0, actualFirstPropertyName);
				console.log('[ComfyUI Dual] Got first binary data, size:', firstImageBuffer.length, 'bytes');
				
				const mimeType = items[0].binary![actualFirstPropertyName].mimeType;
				if (!mimeType || !mimeType.startsWith('image/')) {
					throw new NodeApiError(this.getNode(), {
						message: `Invalid media type for first image: ${mimeType}. Only images are supported.`
					});
				}
			} else {
				const firstInputImage = this.getNodeParameter('firstInputImage', 0) as string;
				firstImageBuffer = Buffer.from(firstInputImage, 'base64');
			}

			// Prepare second image
			let secondImageBuffer: Buffer;
			if (secondInputType === 'url') {
				const secondInputImage = this.getNodeParameter('secondInputImage', 0) as string;
				console.log('[ComfyUI Dual] Downloading second image from URL:', secondInputImage);
				const response = await this.helpers.request({
					method: 'GET',
					url: secondInputImage,
					encoding: null,
				});
				secondImageBuffer = Buffer.from(response);
			} else if (secondInputType === 'binary') {
				console.log('[ComfyUI Dual] Getting second binary data from input');
				const secondBinaryPropertyName = this.getNodeParameter('secondBinaryPropertyName', 0) as string;
				console.log('[ComfyUI Dual] Looking for second binary property:', secondBinaryPropertyName);
				
				const items = this.getInputData();
				const binaryProperties = Object.keys(items[0].binary || {});
				
				let actualSecondPropertyName = secondBinaryPropertyName;
				
				if (!items[0].binary?.[secondBinaryPropertyName]) {
					console.log(`[ComfyUI Dual] Binary property "${secondBinaryPropertyName}" not found, searching for alternatives...`);
					
					// Find alternative that's different from the first image
					const imageProperty = binaryProperties.find(key => 
						items[0].binary![key].mimeType?.startsWith('image/') && 
						key !== (firstInputType === 'binary' ? this.getNodeParameter('firstBinaryPropertyName', 0) as string : '')
					);
					
					if (imageProperty) {
						console.log(`[ComfyUI Dual] Found alternative second image property: "${imageProperty}"`);
						actualSecondPropertyName = imageProperty;
					} else {
						throw new NodeApiError(this.getNode(), { 
							message: `No binary data found in property "${secondBinaryPropertyName}" and no image alternatives found for second image`
						});
					}
				}
				
				secondImageBuffer = await this.helpers.getBinaryDataBuffer(0, actualSecondPropertyName);
				console.log('[ComfyUI Dual] Got second binary data, size:', secondImageBuffer.length, 'bytes');
				
				const mimeType = items[0].binary![actualSecondPropertyName].mimeType;
				if (!mimeType || !mimeType.startsWith('image/')) {
					throw new NodeApiError(this.getNode(), {
						message: `Invalid media type for second image: ${mimeType}. Only images are supported.`
					});
				}
			} else {
				const secondInputImage = this.getNodeParameter('secondInputImage', 0) as string;
				secondImageBuffer = Buffer.from(secondInputImage, 'base64');
			}

			// Upload first image to ComfyUI
			console.log('[ComfyUI Dual] Uploading first image...');
			const firstFormData = new FormData();
			firstFormData.append('image', firstImageBuffer, 'first_input.png');
			firstFormData.append('subfolder', '');
			firstFormData.append('overwrite', 'true');

			const firstUploadResponse = await this.helpers.request({
				method: 'POST',
				url: `${apiUrl}/upload/image`,
				headers: {
					...headers,
					...firstFormData.getHeaders(),
				},
				body: firstFormData,
			});

			const firstImageInfo = JSON.parse(firstUploadResponse) as ImageInfo;
			console.log('[ComfyUI Dual] First image uploaded:', firstImageInfo);

			// Upload second image to ComfyUI
			console.log('[ComfyUI Dual] Uploading second image...');
			const secondFormData = new FormData();
			secondFormData.append('image', secondImageBuffer, 'second_input.png');
			secondFormData.append('subfolder', '');
			secondFormData.append('overwrite', 'true');

			const secondUploadResponse = await this.helpers.request({
				method: 'POST',
				url: `${apiUrl}/upload/image`,
				headers: {
					...headers,
					...secondFormData.getHeaders(),
				},
				body: secondFormData,
			});

			const secondImageInfo = JSON.parse(secondUploadResponse) as ImageInfo;
			console.log('[ComfyUI Dual] Second image uploaded:', secondImageInfo);

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

			// Find LoadImage nodes and update their image data
			const loadImageNodes = Object.values(workflowData as ComfyUIWorkflow).filter((node: ComfyUINode) => 
				node.class_type === 'LoadImage' && node.inputs && node.inputs.image !== undefined
			);

			if (loadImageNodes.length < 2) {
				throw new NodeApiError(this.getNode(), { 
					message: `Found ${loadImageNodes.length} LoadImage node(s) in the workflow. The workflow must contain at least 2 LoadImage nodes for dual image processing.`
				});
			}

			// Update the first two LoadImage nodes with the uploaded images
			loadImageNodes[0].inputs.image = firstImageInfo.name;
			loadImageNodes[1].inputs.image = secondImageInfo.name;

			console.log('[ComfyUI Dual] Updated LoadImage nodes with uploaded images');

			// Queue image generation
			console.log('[ComfyUI Dual] Queueing image generation...');
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
			console.log('[ComfyUI Dual] Image generation queued with ID:', promptId);

			// Poll for completion
			let attempts = 0;
			const maxAttempts = 60 * timeout;
			await new Promise(resolve => setTimeout(resolve, 5000));
			while (attempts < maxAttempts) {
				console.log(`[ComfyUI Dual] Checking image generation status (attempt ${attempts + 1}/${maxAttempts})...`);
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
					console.log('[ComfyUI Dual] Prompt not found in history');
					continue;
				}

				if (promptResult.status === undefined) {
					console.log('[ComfyUI Dual] Execution status not found');
					continue;
				}

				if (promptResult.status?.completed) {
					console.log('[ComfyUI Dual] Image generation completed');

					if (promptResult.status?.status_str === 'error') {
						throw new NodeApiError(this.getNode(), { message: '[ComfyUI Dual] Image generation failed' });
					}

					// Check outputs structure
					console.log('[ComfyUI Dual] Raw outputs structure:', JSON.stringify(promptResult.outputs, null, 2));
					
					// Get all images outputs
					const imageOutputs = Object.values(promptResult.outputs)
						.flatMap((nodeOutput: any) => nodeOutput.images || [])
						.filter((image: any) => image.type === 'output' || image.type === 'temp')
						.map((img: any) => ({
							...img,
							url: `${apiUrl}/view?filename=${img.filename}&subfolder=${img.subfolder || ''}&type=${img.type}`
						}));

					console.log('[ComfyUI Dual] Found image outputs:', imageOutputs);

					if (imageOutputs.length === 0) {
						throw new NodeApiError(this.getNode(), { message: '[ComfyUI Dual] No image outputs found in results' });
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

                    console.log('[ComfyUI Dual] Using media directly from ComfyUI');
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
                            inputImages: {
                                first: firstImageInfo.name,
                                second: secondImageInfo.name
                            }
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
			console.error('[ComfyUI Dual] Image generation error:', error);
			throw new NodeApiError(this.getNode(), { 
				message: `ComfyUI Dual API Error: ${error.message}`,
				description: error.description || ''
			});
		}
	}
} 