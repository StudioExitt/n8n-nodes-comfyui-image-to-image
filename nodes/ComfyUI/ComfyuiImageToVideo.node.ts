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

export class ComfyuiImageToVideo implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'ComfyUI Video Generator',
		name: 'comfyuiImageToVideo',
		icon: 'fa:video',
		group: ['transform'],
		version: 1,
		description: '🎬 Generate videos from two input images using ComfyUI workflows (AnimateDiff, SVD)',
		defaults: {
			name: 'ComfyUI Video Generator',
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
				description: 'The ComfyUI workflow in JSON format with video output nodes (e.g., AnimateDiff, SVD)',
			},
			{
				displayName: 'First Image Input Type',
				name: 'firstImageType',
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
				displayName: 'First Image',
				name: 'firstImage',
				type: 'string',
				default: '',
				required: true,
				displayOptions: {
					show: {
						firstImageType: ['url', 'base64'],
					},
				},
				description: 'URL or base64 data of the first input image',
			},
			{
				displayName: 'First Image Binary Property',
				name: 'firstImageBinaryProperty',
				type: 'string',
				default: 'data',
				required: true,
				displayOptions: {
					show: {
						firstImageType: ['binary'],
					},
				},
				description: 'Name of the binary property containing the first image',
			},
			{
				displayName: 'Second Image Input Type',
				name: 'secondImageType',
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
				displayName: 'Second Image',
				name: 'secondImage',
				type: 'string',
				default: '',
				required: true,
				displayOptions: {
					show: {
						secondImageType: ['url', 'base64'],
					},
				},
				description: 'URL or base64 data of the second input image',
			},
			{
				displayName: 'Second Image Binary Property',
				name: 'secondImageBinaryProperty',
				type: 'string',
				default: 'data2',
				required: true,
				displayOptions: {
					show: {
						secondImageType: ['binary'],
					},
				},
				description: 'Name of the binary property containing the second image',
			},
			{
				displayName: 'First Image Node ID',
				name: 'firstImageNodeId',
				type: 'string',
				default: 'load_image_1',
				required: true,
				description: 'Node ID in workflow for the first LoadImage node',
			},
			{
				displayName: 'Second Image Node ID',
				name: 'secondImageNodeId',
				type: 'string',
				default: 'load_image_2',
				required: true,
				description: 'Node ID in workflow for the second LoadImage node',
			},
			{
				displayName: 'Video Frame Count',
				name: 'frameCount',
				type: 'number',
				default: 16,
				description: 'Number of frames to generate for the video',
			},
			{
				displayName: 'Video Frame Rate',
				name: 'frameRate',
				type: 'number',
				default: 8,
				description: 'Frame rate for the output video',
			},
			{
				displayName: 'Timeout',
				name: 'timeout',
				type: 'number',
				default: 60,
				description: 'Maximum time in minutes to wait for video generation',
			},
		],
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const credentials = await this.getCredentials('comfyUIApi');
		const workflow = this.getNodeParameter('workflow', 0) as string;
		const firstImageType = this.getNodeParameter('firstImageType', 0) as string;
		const secondImageType = this.getNodeParameter('secondImageType', 0) as string;
		const firstImageNodeId = this.getNodeParameter('firstImageNodeId', 0) as string;
		const secondImageNodeId = this.getNodeParameter('secondImageNodeId', 0) as string;
		const frameCount = this.getNodeParameter('frameCount', 0) as number;
		const frameRate = this.getNodeParameter('frameRate', 0) as number;
		const timeout = this.getNodeParameter('timeout', 0) as number;

		const apiUrl = credentials.apiUrl as string;
		const apiKey = credentials.apiKey as string;

		console.log('[ComfyUI Video] Executing video generation with API URL:', apiUrl);

		const headers: Record<string, string> = {
			'Content-Type': 'application/json',
		};

		if (apiKey) {
			console.log('[ComfyUI Video] Using API key authentication');
			headers['Authorization'] = `Bearer ${apiKey}`;
		}

		try {
			// Check API connection
			console.log('[ComfyUI Video] Checking API connection...');
			await this.helpers.request({
				method: 'GET',
				url: `${apiUrl}/system_stats`,
				headers,
				json: true,
			});

			// Helper function to get image buffer
			const getImageBuffer = async (inputType: string, imageParam: string, binaryParam: string, imageIndex: number = 0): Promise<Buffer> => {
				if (inputType === 'url') {
					const imageUrl = this.getNodeParameter(imageParam, 0) as string;
					console.log(`[ComfyUI Video] Downloading image ${imageIndex + 1} from URL: ${imageUrl}`);
					const response = await this.helpers.request({
						method: 'GET',
						url: imageUrl,
						encoding: null,
					});
					return Buffer.from(response);
				} else if (inputType === 'binary') {
					console.log(`[ComfyUI Video] Getting binary data for image ${imageIndex + 1} from input: ${binaryParam}`);
					
					const binaryPropertyName = this.getNodeParameter(binaryParam, 0) as string;
					console.log(`[ComfyUI Video] Looking for binary property: ${binaryPropertyName}`);
					
					const items = this.getInputData();
					console.log(`[ComfyUI Video] Total input items: ${items.length}`);
					
					// For the first image (imageIndex 0), try to get from the specified property
					// For the second image (imageIndex 1), try to get from a different input item or property
					let targetItem = items[0];
					let actualPropertyName = binaryPropertyName;
					
					// Check if we have multiple input items
					if (imageIndex === 1 && items.length > 1) {
						targetItem = items[1];
						console.log(`[ComfyUI Video] Using input item ${imageIndex + 1} for second image`);
					}
					
					const binaryProperties = Object.keys(targetItem.binary || {});
					console.log(`[ComfyUI Video] Available binary properties in item ${imageIndex + 1}: ${binaryProperties}`);
					
					if (!targetItem.binary?.[binaryPropertyName]) {
						console.log(`[ComfyUI Video] Binary property "${binaryPropertyName}" not found in item ${imageIndex + 1}, searching for alternatives...`);
						
						// For second image, try common second image property names first
						if (imageIndex === 1) {
							const secondImageProps = ['data2', 'image2', 'second_image', 'secondImage'];
							const foundSecondProp = secondImageProps.find(prop => 
								targetItem.binary?.[prop]?.mimeType?.startsWith('image/')
							);
							
							if (foundSecondProp) {
								console.log(`[ComfyUI Video] Found second image property: "${foundSecondProp}"`);
								actualPropertyName = foundSecondProp;
							}
						}
						
						// If still not found, look for any image property
						if (!targetItem.binary?.[actualPropertyName]) {
							const imageProperty = binaryProperties.find(key => 
								targetItem.binary![key].mimeType?.startsWith('image/')
							);
							
							if (imageProperty) {
								console.log(`[ComfyUI Video] Found alternative image property: "${imageProperty}"`);
								actualPropertyName = imageProperty;
							} else {
								throw new NodeApiError(this.getNode(), { 
									message: `No binary data found in property "${binaryPropertyName}" for image ${imageIndex + 1} and no image alternatives found`
								});
							}
						}
					}
					
					const imageBuffer = await this.helpers.getBinaryDataBuffer(imageIndex === 1 && items.length > 1 ? 1 : 0, actualPropertyName);
					console.log(`[ComfyUI Video] Got binary data for image ${imageIndex + 1}, size: ${imageBuffer.length} bytes`);
					
					const mimeType = targetItem.binary![actualPropertyName].mimeType;
					console.log(`[ComfyUI Video] Binary data mime type for image ${imageIndex + 1}: ${mimeType}`);
					
					if (!mimeType || !mimeType.startsWith('image/')) {
						throw new NodeApiError(this.getNode(), {
							message: `Invalid media type for image ${imageIndex + 1}: ${mimeType}. Only images are supported.`
						});
					}

					return imageBuffer;
				} else {
					const imageData = this.getNodeParameter(imageParam, 0) as string;
					return Buffer.from(imageData, 'base64');
				}
			};

			// Helper function to upload image
			const uploadImage = async (imageBuffer: Buffer, filename: string): Promise<ImageInfo> => {
				const formData = new FormData();
				formData.append('image', imageBuffer, filename);
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

				return JSON.parse(uploadResponse) as ImageInfo;
			};

			// Prepare first image
			const firstImageBuffer = await getImageBuffer(firstImageType, 'firstImage', 'firstImageBinaryProperty', 0);
			const secondImageBuffer = await getImageBuffer(secondImageType, 'secondImage', 'secondImageBinaryProperty', 1);

			// Upload first image to ComfyUI
			console.log('[ComfyUI Video] Uploading first image...');
			const firstImageInfo = await uploadImage(firstImageBuffer, 'first_input.png');
			console.log('[ComfyUI Video] First image uploaded:', firstImageInfo);

			// Upload second image to ComfyUI
			console.log('[ComfyUI Video] Uploading second image...');
			const secondImageInfo = await uploadImage(secondImageBuffer, 'second_input.png');
			console.log('[ComfyUI Video] Second image uploaded:', secondImageInfo);

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

			// Find and update the first LoadImage node
			const firstLoadImageNode = workflowData[firstImageNodeId];
			if (!firstLoadImageNode || firstLoadImageNode.class_type !== 'LoadImage') {
				throw new NodeApiError(this.getNode(), { 
					message: `No LoadImage node found with ID "${firstImageNodeId}". Please check your workflow.`
				});
			}
			firstLoadImageNode.inputs.image = firstImageInfo.name;
			console.log(`[ComfyUI Video] Updated first LoadImage node "${firstImageNodeId}" with image: ${firstImageInfo.name}`);

			// Find and update the second LoadImage node
			const secondLoadImageNode = workflowData[secondImageNodeId];
			if (!secondLoadImageNode || secondLoadImageNode.class_type !== 'LoadImage') {
				throw new NodeApiError(this.getNode(), { 
					message: `No LoadImage node found with ID "${secondImageNodeId}". Please check your workflow.`
				});
			}
			secondLoadImageNode.inputs.image = secondImageInfo.name;
			console.log(`[ComfyUI Video] Updated second LoadImage node "${secondImageNodeId}" with image: ${secondImageInfo.name}`);

			// Log the final workflow state for debugging
			console.log(`[ComfyUI Video] Final workflow LoadImage nodes:`, {
				[firstImageNodeId]: firstLoadImageNode.inputs.image,
				[secondImageNodeId]: secondLoadImageNode.inputs.image
			});

			// Update video generation parameters in workflow if applicable
			const videoNodeTypes = [
				'AnimateDiffSampler',
				'SVD_img2vid_Conditioning',
				'VideoHelperSuite',
				'VHS_VideoCombine',
				'AnimateDiffCombine'
			];

			Object.values(workflowData as ComfyUIWorkflow).forEach((node: ComfyUINode) => {
				if (videoNodeTypes.includes(node.class_type)) {
					// Update common video parameters
					if (node.inputs.frame_count !== undefined) {
						node.inputs.frame_count = frameCount;
					}
					if (node.inputs.frames !== undefined) {
						node.inputs.frames = frameCount;
					}
					if (node.inputs.frame_rate !== undefined) {
						node.inputs.frame_rate = frameRate;
					}
					if (node.inputs.fps !== undefined) {
						node.inputs.fps = frameRate;
					}
					console.log(`[ComfyUI Video] Updated ${node.class_type} with frameCount: ${frameCount}, frameRate: ${frameRate}`);
				}
			});

			// Queue video generation
			console.log('[ComfyUI Video] Queueing video generation...');
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
			console.log('[ComfyUI Video] Video generation queued with ID:', promptId);

			// Poll for completion with longer timeout for video generation
			let attempts = 0;
			const maxAttempts = 60 * timeout; // Convert minutes to seconds
			await new Promise(resolve => setTimeout(resolve, 10000)); // Initial wait for video processing

			while (attempts < maxAttempts) {
				console.log(`[ComfyUI Video] Checking video generation status (attempt ${attempts + 1}/${maxAttempts})...`);
				await new Promise(resolve => setTimeout(resolve, 5000)); // Check every 5 seconds for video
				attempts++;

				const history = await this.helpers.request({
					method: 'GET',
					url: `${apiUrl}/history/${promptId}`,
					headers,
					json: true,
				});

				const promptResult = history[promptId];
				if (!promptResult) {
					console.log('[ComfyUI Video] Prompt not found in history');
					continue;
				}

				if (promptResult.status === undefined) {
					console.log('[ComfyUI Video] Execution status not found');
					continue;
				}

				if (promptResult.status?.completed) {
					console.log('[ComfyUI Video] Video generation completed');

					if (promptResult.status?.status_str === 'error') {
						throw new NodeApiError(this.getNode(), { message: '[ComfyUI Video] Video generation failed' });
					}

					// Check outputs structure
					console.log('[ComfyUI Video] Raw outputs structure:', JSON.stringify(promptResult.outputs, null, 2));
					
					// Look for video outputs (common video output node types)
					const videoOutputs = Object.values(promptResult.outputs)
						.flatMap((nodeOutput: any) => [
							...(nodeOutput.gifs || []),
							...(nodeOutput.videos || []),
							...(nodeOutput.images || []).filter((img: any) => 
								img.filename?.endsWith('.gif') || 
								img.filename?.endsWith('.mp4') || 
								img.filename?.endsWith('.webm') ||
								img.filename?.endsWith('.mov')
							)
						])
						.filter((output: any) => output.type === 'output' || output.type === 'temp')
						.map((video: any) => ({
							...video,
							url: `${apiUrl}/view?filename=${video.filename}&subfolder=${video.subfolder || ''}&type=${video.type}`
						}));

					console.log('[ComfyUI Video] Found video outputs:', videoOutputs);

					if (videoOutputs.length === 0) {
						throw new NodeApiError(this.getNode(), { message: '[ComfyUI Video] No video outputs found in results' });
					}

					// Return the first video output
					const videoOutput = videoOutputs[0];
                    
                    const videoResponse = await this.helpers.request({
                        method: 'GET',
                        url: videoOutput.url,
                        encoding: null,
                        resolveWithFullResponse: true
                    });

                    if (videoResponse.statusCode === 404) {
                        throw new NodeApiError(this.getNode(), { message: `Video file not found at ${videoOutput.url}` });
                    }

                    console.log('[ComfyUI Video] Using video directly from ComfyUI');
                    const buffer = Buffer.from(videoResponse.body);
                    const base64Data = buffer.toString('base64');
                    const fileSize = Math.round(buffer.length / 1024 * 10) / 10 + " kB";

                    // Determine MIME type based on file extension
                    let mimeType = 'video/mp4';
                    let fileExtension = 'mp4';
                    let fileType: 'video' | 'image' = 'video';
                    
                    if (videoOutput.filename.endsWith('.gif')) {
                        mimeType = 'image/gif';
                        fileExtension = 'gif';
                        fileType = 'image'; // GIF는 기술적으로 image로 분류
                    } else if (videoOutput.filename.endsWith('.webm')) {
                        mimeType = 'video/webm';
                        fileExtension = 'webm';
                    } else if (videoOutput.filename.endsWith('.mov')) {
                        mimeType = 'video/quicktime';
                        fileExtension = 'mov';
                    }

                    return [[{
                        json: {
                            mimeType,
                            fileName: videoOutput.filename,
                            data: base64Data,
                            status: promptResult.status,
                            frameCount,
                            frameRate,
                            duration: frameCount / frameRate,
                        },
                        binary: {
                            data: {
                                fileName: videoOutput.filename,
                                data: base64Data,
                                fileType,
                                fileSize,
                                fileExtension,
                                mimeType
                            }
                        }
                    }]];
				}
			}
			throw new NodeApiError(this.getNode(), { message: `Video generation timeout after ${timeout} minutes` });
		} catch (error) {
			console.error('[ComfyUI Video] Video generation error:', error);
			throw new NodeApiError(this.getNode(), { 
				message: `ComfyUI API Error: ${error.message}`,
				description: error.description || ''
			});
		}
	}
} 