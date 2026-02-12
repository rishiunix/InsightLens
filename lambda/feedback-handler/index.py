import json
import os
import boto3
from datetime import datetime

sns = boto3.client('sns')

FEEDBACK_TOPIC_ARN = os.environ['FEEDBACK_TOPIC_ARN']

def handler(event, context):
    try:
        # Handle both direct invoke and API Gateway formats
        if 'body' in event:
            if isinstance(event['body'], str):
                body = json.loads(event['body'])
            else:
                body = event['body']
        else:
            body = event
        
        feedback = body.get('feedback', '')
        user_agent = event.get('headers', {}).get('User-Agent', 'Unknown')
        
        message = f"""
New Feedback Received - InsightLens

Feedback:
{feedback}

Timestamp: {datetime.utcnow().isoformat()}
User Agent: {user_agent}
"""
        
        sns.publish(
            TopicArn=FEEDBACK_TOPIC_ARN,
            Subject='InsightLens Feedback',
            Message=message
        )
        
        return {
            'statusCode': 200,
            'body': json.dumps({'message': 'Feedback submitted successfully'})
        }
    except Exception as e:
        return {
            'statusCode': 500,
            'body': json.dumps({'error': str(e)})
        }
