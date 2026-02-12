import json
import os
import boto3
import base64

bedrock = boto3.client('bedrock-runtime')
s3 = boto3.client('s3')

IMAGES_BUCKET = os.environ['IMAGES_BUCKET']
MODEL_ID = os.environ['MODEL_ID']

def handler(event, context):
    try:
        image_key = event['imageKey']
        
        # Get image from S3
        response = s3.get_object(Bucket=IMAGES_BUCKET, Key=image_key)
        image_bytes = response['Body'].read()
        image_base64 = base64.b64encode(image_bytes).decode('utf-8')
        
        # Determine content type
        content_type = response['ContentType']
        if 'jpeg' in content_type or 'jpg' in content_type:
            media_type = 'image/jpeg'
        elif 'png' in content_type:
            media_type = 'image/png'
        elif 'gif' in content_type:
            media_type = 'image/gif'
        elif 'webp' in content_type:
            media_type = 'image/webp'
        else:
            media_type = 'image/jpeg'
        
        # Prepare prompts
        prompts = [
            {
                'name': 'detailed_description',
                'prompt': 'Provide a detailed, creative description of this image. Describe what you see, the mood, the setting, colors, and any interesting details. Write as if you\'re telling a story about this image.'
            },
            {
                'name': 'scene_understanding',
                'prompt': 'Analyze this image and provide: 1) Main subject/focus, 2) Scene type (indoor/outdoor/nature/urban/etc), 3) Time of day if apparent, 4) Dominant colors, 5) Overall mood/atmosphere'
            },
            {
                'name': 'nutrition_analysis',
                'prompt': '''If this image contains food, provide a detailed nutrition analysis as a professional nutritionist:

1. FOOD ITEMS: List all visible foods and ingredients
2. ESTIMATED CALORIES: Total calories (provide specific number or range)
3. MACRONUTRIENTS:
   - Protein: X grams
   - Carbohydrates: X grams
   - Fats: X grams
4. PORTION SIZE: Estimate serving size (cups, ounces, etc.)
5. HEALTH SCORE: Rate 1-10 with brief reasoning
6. ALLERGENS: List common allergens (dairy, nuts, gluten, etc.)
7. NUTRITIONAL HIGHLIGHTS: Key vitamins, minerals, or benefits
8. SUGGESTIONS: Healthier alternatives or modifications

If this is NOT food, simply respond: "Not a food image - nutrition analysis not applicable."

Be specific with numbers. Use ranges if uncertain (e.g., 400-500 calories).'''
            },
            {
                'name': 'safety_analysis',
                'prompt': 'Analyze this image for safety and appropriateness. Is there anything concerning, inappropriate, or potentially harmful? Provide a brief safety assessment.'
            }
        ]
        
        results = {}
        
        for prompt_config in prompts:
            request_body = {
                'anthropic_version': 'bedrock-2023-05-31',
                'max_tokens': 1000,
                'messages': [
                    {
                        'role': 'user',
                        'content': [
                            {
                                'type': 'image',
                                'source': {
                                    'type': 'base64',
                                    'media_type': media_type,
                                    'data': image_base64
                                }
                            },
                            {
                                'type': 'text',
                                'text': prompt_config['prompt']
                            }
                        ]
                    }
                ]
            }
            
            response = bedrock.invoke_model(
                modelId=MODEL_ID,
                body=json.dumps(request_body)
            )
            
            response_body = json.loads(response['body'].read())
            results[prompt_config['name']] = response_body['content'][0]['text']
        
        return {
            'analysisId': event['analysisId'],
            'imageKey': event['imageKey'],
            'userId': event['userId'],
            'bedrockResults': results
        }
    except Exception as e:
        return {
            'analysisId': event.get('analysisId'),
            'imageKey': event.get('imageKey'),
            'userId': event.get('userId'),
            'bedrockResults': {'error': str(e)}
        }
