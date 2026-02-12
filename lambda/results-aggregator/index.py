import json
import os
import boto3
from decimal import Decimal

s3 = boto3.client('s3')
dynamodb = boto3.resource('dynamodb')

RESULTS_BUCKET = os.environ['RESULTS_BUCKET']
ANALYSIS_TABLE = os.environ['ANALYSIS_TABLE']

table = dynamodb.Table(ANALYSIS_TABLE)

class DecimalEncoder(json.JSONEncoder):
    def default(self, obj):
        if isinstance(obj, Decimal):
            return float(obj)
        return super(DecimalEncoder, self).default(obj)

def handler(event, context):
    try:
        print(f"Received event: {json.dumps(event, cls=DecimalEncoder)}")
        
        analysis_id = event['analysisId']
        user_id = event['userId']
        
        # Get existing record to get original timestamp
        response = table.query(
            KeyConditionExpression='analysisId = :aid',
            ExpressionAttributeValues={':aid': analysis_id},
            Limit=1
        )
        
        if not response['Items']:
            return {'statusCode': 404, 'error': 'Analysis not found'}
        
        original_timestamp = response['Items'][0]['timestamp']
        
        # Aggregate all results
        aggregated_results = {
            'analysisId': analysis_id,
            'imageKey': event['imageKey'],
            'userId': user_id,
            'timestamp': original_timestamp,
            'rekognition': event.get('rekognitionResults', {}).get('rekognitionResults', event.get('rekognitionResults', {})),
            'bedrock': event.get('bedrockResults', {}).get('bedrockResults', event.get('bedrockResults', {})),
            'textract': event.get('textractResults', {})
        }
        
        # Save to S3
        results_key = f"results/{user_id}/{analysis_id}.json"
        s3.put_object(
            Bucket=RESULTS_BUCKET,
            Key=results_key,
            Body=json.dumps(aggregated_results, indent=2, cls=DecimalEncoder),
            ContentType='application/json'
        )
        
        # Update DynamoDB
        table.update_item(
            Key={
                'analysisId': analysis_id,
                'timestamp': original_timestamp
            },
            UpdateExpression='SET #status = :status, resultsKey = :resultsKey',
            ExpressionAttributeNames={'#status': 'status'},
            ExpressionAttributeValues={
                ':status': 'completed',
                ':resultsKey': results_key
            }
        )
        
        return {
            'statusCode': 200,
            'analysisId': analysis_id,
            'resultsKey': results_key,
            'status': 'completed'
        }
    except Exception as e:
        return {
            'statusCode': 500,
            'error': str(e)
        }
