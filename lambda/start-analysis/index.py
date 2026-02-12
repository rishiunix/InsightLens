import json
import os
import boto3

sfn = boto3.client('stepfunctions')
s3 = boto3.client('s3')

STATE_MACHINE_ARN = os.environ['STATE_MACHINE_ARN']

def handler(event, context):
    try:
        body = json.loads(event['body']) if isinstance(event.get('body'), str) else event.get('body', {})
        
        analysis_id = body['analysisId']
        image_key = body['imageKey']
        user_id = body['userId']
        
        # Verify image exists
        bucket = os.environ['IMAGES_BUCKET']
        s3.head_object(Bucket=bucket, Key=image_key)
        
        # Start Step Functions
        sfn.start_execution(
            stateMachineArn=STATE_MACHINE_ARN,
            input=json.dumps({
                'analysisId': analysis_id,
                'imageKey': image_key,
                'userId': user_id
            })
        )
        
        return {
            'statusCode': 200,
            'headers': {'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({'status': 'started'})
        }
    except Exception as e:
        return {
            'statusCode': 500,
            'headers': {'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({'error': str(e)})
        }
