import {
	IExecuteFunctions,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
	NodeConnectionType,
} from 'n8n-workflow';
import { NodeApiError } from 'n8n-workflow';

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

export class ComfyuiTextToAudio implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'ComfyUI Audio Generator',
		name: 'comfyuiAudioGenerator',
		icon: 'file:comfyui.svg',
		group: ['transform'],
		version: 1,
		description: '🎵 Generate audio from text using ComfyUI workflows with ACE Step Audio models',
		defaults: {
			name: 'ComfyUI Text to Audio',
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
				default: JSON.stringify({
					"14": {
						"inputs": {
							"tags": "Contemporary rock instrumental with powerful electric guitar power chords, dynamic drumming, driving bass, soaring lead guitar solos, arena rock energy, 135 BPM, stadium-worthy hooks, freedom and adventure spirit, no vocals, pure instrumental",
							"lyrics": "",
							"lyrics_strength": 0.99,
							"clip": ["40", 1]
						},
						"class_type": "TextEncodeAceStepAudio",
						"_meta": {
							"title": "TextEncodeAceStepAudio"
						}
					},
					"17": {
						"inputs": {
							"seconds": 180,
							"batch_size": 1
						},
						"class_type": "EmptyAceStepLatentAudio",
						"_meta": {
							"title": "EmptyAceStepLatentAudio"
						}
					},
					"18": {
						"inputs": {
							"samples": ["52", 0],
							"vae": ["40", 2]
						},
						"class_type": "VAEDecodeAudio",
						"_meta": {
							"title": "오디오 VAE 디코드"
						}
					},
					"40": {
						"inputs": {
							"ckpt_name": "ace_step_v1_3.5b.safetensors"
						},
						"class_type": "CheckpointLoaderSimple",
						"_meta": {
							"title": "체크포인트 로드"
						}
					},
					"44": {
						"inputs": {
							"conditioning": ["14", 0]
						},
						"class_type": "ConditioningZeroOut",
						"_meta": {
							"title": "조건 (0으로 출력)"
						}
					},
					"49": {
						"inputs": {
							"model": ["51", 0],
							"operation": ["50", 0]
						},
						"class_type": "LatentApplyOperationCFG",
						"_meta": {
							"title": "잠재 데이터 CFG 연산 (연산 적용)"
						}
					},
					"50": {
						"inputs": {
							"multiplier": 1.0
						},
						"class_type": "LatentOperationTonemapReinhard",
						"_meta": {
							"title": "잠재 데이터 연산 (톤맵 레인하르트)"
						}
					},
					"51": {
						"inputs": {
							"shift": 5.0,
							"model": ["40", 0]
						},
						"class_type": "ModelSamplingSD3",
						"_meta": {
							"title": "모델 샘플링 (SD3)"
						}
					},
					"52": {
						"inputs": {
							"seed": 763036669622641,
							"steps": 50,
							"cfg": 5,
							"sampler_name": "euler",
							"scheduler": "simple",
							"denoise": 1,
							"model": ["49", 0],
							"positive": ["14", 0],
							"negative": ["44", 0],
							"latent_image": ["17", 0]
						},
						"class_type": "KSampler",
						"_meta": {
							"title": "KSampler"
						}
					},
					"59": {
						"inputs": {
							"filename_prefix": "audio/ComfyUI",
							"quality": "128k",
							"audioUI": "",
							"audio": ["18", 0]
						},
						"class_type": "SaveAudioMP3",
						"_meta": {
							"title": "Save Audio (MP3)"
						}
					}
				}, null, 2),
				required: true,
				description: 'The ComfyUI workflow in JSON format for text-to-audio generation',
			},
			{
				displayName: 'Text Prompt',
				name: 'textPrompt',
				type: 'string',
				typeOptions: {
					rows: 3,
				},
				default: 'Contemporary rock instrumental with powerful electric guitar power chords, dynamic drumming, driving bass, soaring lead guitar solos, arena rock energy, 135 BPM, stadium-worthy hooks, freedom and adventure spirit, no vocals, pure instrumental',
				required: true,
				description: 'Description of the audio you want to generate',
			},
			{
				displayName: 'Audio Duration (Seconds)',
				name: 'audioDuration',
				type: 'number',
				default: 180,
				description: 'Duration of the generated audio in seconds',
			},
			{
				displayName: 'Audio Quality',
				name: 'audioQuality',
				type: 'options',
				options: [
					{ name: '128k', value: '128k' },
					{ name: '192k', value: '192k' },
					{ name: '256k', value: '256k' },
					{ name: '320k', value: '320k' },
					{ name: '64k', value: '64k' }
				],
				default: '128k',
				description: 'Quality/bitrate of the generated audio',
			},
			{
				displayName: 'Seed',
				name: 'seed',
				type: 'number',
				default: -1,
				description: 'Random seed for generation (-1 for random)',
			},
			{
				displayName: 'Steps',
				name: 'steps',
				type: 'number',
				default: 50,
				description: 'Number of sampling steps',
			},
			{
				displayName: 'CFG Scale',
				name: 'cfg',
				type: 'number',
				default: 5,
				description: 'CFG scale for guidance strength',
			},
			{
				displayName: 'Timeout',
				name: 'timeout',
				type: 'number',
				default: 30,
				description: 'Maximum time in minutes to wait for audio generation',
			},
		],
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const credentials = await this.getCredentials('comfyUIApi');
		const workflow = this.getNodeParameter('workflow', 0) as string;
		const textPrompt = this.getNodeParameter('textPrompt', 0) as string;
		const audioDuration = this.getNodeParameter('audioDuration', 0) as number;
		const audioQuality = this.getNodeParameter('audioQuality', 0) as string;
		const seed = this.getNodeParameter('seed', 0) as number;
		const steps = this.getNodeParameter('steps', 0) as number;
		const cfg = this.getNodeParameter('cfg', 0) as number;
		const timeout = this.getNodeParameter('timeout', 0) as number;

		const apiUrl = credentials.apiUrl as string;
		const apiKey = credentials.apiKey as string;

		console.log('[ComfyUI Audio] Executing audio generation with API URL:', apiUrl);

		const headers: Record<string, string> = {
			'Content-Type': 'application/json',
		};

		if (apiKey) {
			console.log('[ComfyUI Audio] Using API key authentication');
			headers['Authorization'] = `Bearer ${apiKey}`;
		}

		try {
			// Check API connection
			console.log('[ComfyUI Audio] Checking API connection...');
			await this.helpers.request({
				method: 'GET',
				url: `${apiUrl}/system_stats`,
				headers,
				json: true,
			});

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

			// Find and update TextEncodeAceStepAudio node
			const textEncodeNode = Object.values(workflowData as ComfyUIWorkflow).find((node: ComfyUINode) => 
				node.class_type === 'TextEncodeAceStepAudio'
			);

			if (!textEncodeNode) {
				throw new NodeApiError(this.getNode(), { 
					message: 'No TextEncodeAceStepAudio node found in the workflow. The workflow must contain a TextEncodeAceStepAudio node.'
				});
			}

			// Update text prompt
			textEncodeNode.inputs.tags = textPrompt;

			// Find and update audio duration
			const latentAudioNode = Object.values(workflowData as ComfyUIWorkflow).find((node: ComfyUINode) => 
				node.class_type === 'EmptyAceStepLatentAudio'
			);

			if (latentAudioNode) {
				latentAudioNode.inputs.seconds = audioDuration;
			}

			// Find and update KSampler settings
			const ksamplerNode = Object.values(workflowData as ComfyUIWorkflow).find((node: ComfyUINode) => 
				node.class_type === 'KSampler'
			);

			if (ksamplerNode) {
				ksamplerNode.inputs.seed = seed === -1 ? Math.floor(Math.random() * 1000000000000000) : seed;
				ksamplerNode.inputs.steps = steps;
				ksamplerNode.inputs.cfg = cfg;
			}

			// Find and update audio quality
			const saveAudioNode = Object.values(workflowData as ComfyUIWorkflow).find((node: ComfyUINode) => 
				node.class_type === 'SaveAudioMP3'
			);

			if (saveAudioNode) {
				saveAudioNode.inputs.quality = audioQuality;
			}

			// Queue audio generation
			console.log('[ComfyUI Audio] Queueing audio generation...');
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
			console.log('[ComfyUI Audio] Audio generation queued with ID:', promptId);

			// Poll for completion
			let attempts = 0;
			const maxAttempts = 60 * timeout; // Convert minutes to seconds
			await new Promise(resolve => setTimeout(resolve, 5000));
			
			while (attempts < maxAttempts) {
				console.log(`[ComfyUI Audio] Checking audio generation status (attempt ${attempts + 1}/${maxAttempts})...`);
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
					console.log('[ComfyUI Audio] Prompt not found in history');
					continue;
				}

				if (promptResult.status === undefined) {
					console.log('[ComfyUI Audio] Execution status not found');
					continue;
				}

				if (promptResult.status?.completed) {
					console.log('[ComfyUI Audio] Audio generation completed');

					if (promptResult.status?.status_str === 'error') {
						throw new NodeApiError(this.getNode(), { message: '[ComfyUI Audio] Audio generation failed' });
					}

					// Check outputs structure
					console.log('[ComfyUI Audio] Raw outputs structure:', JSON.stringify(promptResult.outputs, null, 2));
					
					// Get all audio outputs
					const audioOutputs = Object.values(promptResult.outputs)
						.flatMap((nodeOutput: any) => nodeOutput.audio || [])
						.filter((audio: any) => audio.type === 'output' || audio.type === 'temp')
						.map((audio: any) => ({
							...audio,
							url: `${apiUrl}/view?filename=${audio.filename}&subfolder=${audio.subfolder || ''}&type=${audio.type}`
						}));

					console.log('[ComfyUI Audio] Found audio outputs:', audioOutputs);

					if (audioOutputs.length === 0) {
						throw new NodeApiError(this.getNode(), { message: '[ComfyUI Audio] No audio outputs found in results' });
					}

					// Return the first audio output
					const audioOutput = audioOutputs[0];
                    
                    const audioResponse = await this.helpers.request({
                        method: 'GET',
                        url: audioOutput.url,
                        encoding: null,
                        resolveWithFullResponse: true
                    });

                    if (audioResponse.statusCode === 404) {
                        throw new NodeApiError(this.getNode(), { message: `Audio file not found at ${audioOutput.url}` });
                    }

                    console.log('[ComfyUI Audio] Using audio directly from ComfyUI');
                    const buffer = Buffer.from(audioResponse.body);
                    const base64Data = buffer.toString('base64');
                    const fileSize = Math.round(buffer.length / 1024 * 10) / 10 + " kB";

                    // Determine MIME type based on file extension
                    let mimeType = 'audio/mpeg';
                    let fileExtension = 'mp3';
                    
                    if (audioOutput.filename.endsWith('.wav')) {
                        mimeType = 'audio/wav';
                        fileExtension = 'wav';
                    } else if (audioOutput.filename.endsWith('.ogg')) {
                        mimeType = 'audio/ogg';
                        fileExtension = 'ogg';
                    } else if (audioOutput.filename.endsWith('.m4a')) {
                        mimeType = 'audio/mp4';
                        fileExtension = 'm4a';
                    }

                    return [[{
                        json: {
                            mimeType,
                            fileName: audioOutput.filename,
                            data: base64Data,
                            status: promptResult.status,
                            prompt: textPrompt,
                            duration: audioDuration,
                            quality: audioQuality,
                        },
                        binary: {
                            data: {
                                fileName: audioOutput.filename,
                                data: base64Data,
                                fileType: 'audio',
                                fileSize,
                                fileExtension,
                                mimeType
                            }
                        }
                    }]];
				}
			}
			throw new NodeApiError(this.getNode(), { message: `Audio generation timeout after ${timeout} minutes` });
		} catch (error) {
			console.error('[ComfyUI Audio] Audio generation error:', error);
			throw new NodeApiError(this.getNode(), { 
				message: `ComfyUI API Error: ${error.message}`,
				description: error.description || ''
			});
		}
	}
} 