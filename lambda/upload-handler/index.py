import json
import os
import boto3
import uuid
from datetime import datetime

s3 = boto3.client('s3')
dynamodb = boto3.resource('dynamodb')
sfn = boto3.client('stepfunctions')

IMAGES_BUCKET = os.environ['IMAGES_BUCKET']
ANALYSIS_TABLE = os.environ['ANALYSIS_TABLE']
STATE_MACHINE_ARN = os.environ['STATE_MACHINE_ARN']

table = dynamodb.Table(ANALYSIS_TABLE)

def handler(event, context):
    try:
        body = json.loads(event['body']) if isinstance(event.get('body'), str) else event.get('body', {})
        
        analysis_id = str(uuid.uuid4())
        user_id = body.get('userId', 'anonymous')
        filename = body.get('filename', 'image.jpg')
        content_type = body.get('contentType', 'image/jpeg')
        
        image_key = f"uploads/{user_id}/{analysis_id}/{filename}"
        
        # Generate presigned URL
        presigned_url = s3.generate_presigned_url(
            'put_object',
            Params={
                'Bucket': IMAGES_BUCKET,
                'Key': image_key,
                'ContentType': content_type
            },
            ExpiresIn=300
        )
        
        # Create initial record
        timestamp = int(datetime.now().timestamp() * 1000)
        table.put_item(Item={
            'analysisId': analysis_id,
            'timestamp': timestamp,
            'userId': user_id,
            'imageKey': image_key,
            'status': 'pending',
            'filename': filename
        })
        
        return {
            'statusCode': 200,
            'headers': {
                'Access-Control-Allow-Origin': '*',
                'Content-Type': 'application/json'
            },
            'body': json.dumps({
                'analysisId': analysis_id,
                'uploadUrl': presigned_url,
                'imageKey': image_key,
                'startAnalysisUrl': f'{os.environ.get("API_URL", "")}/start-analysis'
            })
        }
    except Exception as e:
        return {
            'statusCode': 500,
            'headers': {'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({'error': str(e)})
        }
