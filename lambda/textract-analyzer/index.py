import json
import os
import boto3

textract = boto3.client('textract')

IMAGES_BUCKET = os.environ['IMAGES_BUCKET']

def handler(event, context):
    try:
        image_key = event['imageKey']
        
        # Detect document text
        response = textract.detect_document_text(
            Document={'S3Object': {'Bucket': IMAGES_BUCKET, 'Name': image_key}}
        )
        
        # Extract text blocks
        text_blocks = []
        full_text = []
        
        for block in response.get('Blocks', []):
            if block['BlockType'] == 'LINE':
                text_blocks.append({
                    'text': block.get('Text', ''),
                    'confidence': block.get('Confidence', 0)
                })
                full_text.append(block.get('Text', ''))
        
        result = {
            'analysisId': event['analysisId'],
            'imageKey': event['imageKey'],
            'userId': event['userId'],
            'textractResults': {
                'textBlocks': text_blocks,
                'fullText': ' '.join(full_text)
            }
        }
        
        # Pass through rekognition and bedrock results if present
        if 'rekognitionResults' in event:
            result['rekognitionResults'] = event['rekognitionResults']
        if 'bedrockResults' in event:
            result['bedrockResults'] = event['bedrockResults']
        
        return result
    except Exception as e:
        result = {
            'analysisId': event.get('analysisId'),
            'imageKey': event.get('imageKey'),
            'userId': event.get('userId'),
            'textractResults': {'error': str(e)}
        }
        
        # Pass through rekognition and bedrock results if present
        if 'rekognitionResults' in event:
            result['rekognitionResults'] = event['rekognitionResults']
        if 'bedrockResults' in event:
            result['bedrockResults'] = event['bedrockResults']
        
        return result
