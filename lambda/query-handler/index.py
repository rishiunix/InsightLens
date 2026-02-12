import json
import os
import boto3
from boto3.dynamodb.conditions import Key

s3 = boto3.client('s3')
dynamodb = boto3.resource('dynamodb')

ANALYSIS_TABLE = os.environ['ANALYSIS_TABLE']
RESULTS_BUCKET = os.environ['RESULTS_BUCKET']

table = dynamodb.Table(ANALYSIS_TABLE)

def handler(event, context):
    try:
        path = event.get('path') or ''
        path_params = event.get('pathParameters') or {}
        
        # Get specific analysis
        if 'analysisId' in path_params:
            analysis_id = path_params['analysisId']
            
            response = table.query(
                KeyConditionExpression=Key('analysisId').eq(analysis_id)
            )
            
            if not response['Items']:
                return {
                    'statusCode': 404,
                    'headers': {'Access-Control-Allow-Origin': '*'},
                    'body': json.dumps({'error': 'Analysis not found'})
                }
            
            item = response['Items'][0]
            
            # Get results from S3 if completed
            if item.get('status') == 'completed' and 'resultsKey' in item:
                results_obj = s3.get_object(Bucket=RESULTS_BUCKET, Key=item['resultsKey'])
                results = json.loads(results_obj['Body'].read())
                item['results'] = results
            
            return {
                'statusCode': 200,
                'headers': {
                    'Access-Control-Allow-Origin': '*',
                    'Content-Type': 'application/json'
                },
                'body': json.dumps(item, default=str)
            }
        
        # Get history
        elif 'history' in path:
            query_params = event.get('queryStringParameters') or {}
            user_id = query_params.get('userId', 'anonymous')
            
            response = table.query(
                IndexName='UserIndex',
                KeyConditionExpression=Key('userId').eq(user_id),
                ScanIndexForward=False,
                Limit=50
            )
            
            return {
                'statusCode': 200,
                'headers': {
                    'Access-Control-Allow-Origin': '*',
                    'Content-Type': 'application/json'
                },
                'body': json.dumps(response['Items'], default=str)
            }
        
        return {
            'statusCode': 400,
            'headers': {'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({'error': 'Invalid request'})
        }
    except Exception as e:
        return {
            'statusCode': 500,
            'headers': {'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({'error': str(e)})
        }
