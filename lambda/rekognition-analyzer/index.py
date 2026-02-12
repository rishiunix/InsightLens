import json
import os
import boto3

rekognition = boto3.client('rekognition')
s3 = boto3.client('s3')

IMAGES_BUCKET = os.environ['IMAGES_BUCKET']

def handler(event, context):
    try:
        print(f"Rekognition received: {json.dumps(event)}")
        image_key = event['imageKey']
        
        # Detect labels
        labels_response = rekognition.detect_labels(
            Image={'S3Object': {'Bucket': IMAGES_BUCKET, 'Name': image_key}},
            MaxLabels=50,
            MinConfidence=70
        )
        
        # Detect text
        text_response = rekognition.detect_text(
            Image={'S3Object': {'Bucket': IMAGES_BUCKET, 'Name': image_key}}
        )
        
        # Detect moderation labels
        moderation_response = rekognition.detect_moderation_labels(
            Image={'S3Object': {'Bucket': IMAGES_BUCKET, 'Name': image_key}},
            MinConfidence=60
        )
        
        # Detect faces
        faces_response = rekognition.detect_faces(
            Image={'S3Object': {'Bucket': IMAGES_BUCKET, 'Name': image_key}},
            Attributes=['ALL']
        )
        
        # Try celebrity recognition
        try:
            celebrity_response = rekognition.recognize_celebrities(
                Image={'S3Object': {'Bucket': IMAGES_BUCKET, 'Name': image_key}}
            )
        except:
            celebrity_response = {'CelebrityFaces': []}
        
        return {
            'analysisId': event['analysisId'],
            'imageKey': image_key,
            'userId': event['userId'],
            'rekognitionResults': {
                'labels': labels_response.get('Labels', []),
                'textDetections': text_response.get('TextDetections', []),
                'moderationLabels': moderation_response.get('ModerationLabels', []),
                'faces': faces_response.get('FaceDetails', []),
                'celebrities': celebrity_response.get('CelebrityFaces', [])
            }
        }
    except Exception as e:
        return {
            'analysisId': event.get('analysisId'),
            'imageKey': event.get('imageKey'),
            'userId': event.get('userId'),
            'rekognitionResults': {'error': str(e)}
        }
