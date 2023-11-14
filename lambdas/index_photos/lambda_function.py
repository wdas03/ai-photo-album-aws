from _future_ import print_function
from pprint import pprint
from time import time
import boto3
import json
from opensearchpy import OpenSearch, RequestsHttpConnection
import requests
from requests_aws4auth import AWS4Auth
import urllib.parse
import json

REGION = 'us-east-1'
HOST = 'search-photos-xzh7hrqko56izsipclb6hdfng4.us-east-1.es.amazonaws.com'
INDEX = 'photos' #domain name of OS
SERVICE = 'es'

s3 = boto3.client('s3')

rekognition_client = boto3.client('rekognition')

print('Loading function')

cred = boto3.Session().get_credentials()
auth = AWS4Auth(cred.access_key, cred.secret_key, REGION, SERVICE, session_token=cred.token)

def lambda_handler(event, context):
    bucket = event['Records'][0]['s3']['bucket']['name']
    image = event['Records'][0]['s3']['object']['key']
    
    key = urllib.parse.unquote_plus(event['Records'][0]['s3']['object']['key'], encoding='utf-8')
    print(key)
    
    try:
        response_r = rekognition_client.detect_labels(Image={'S3Object': {'Bucket': bucket, 'Name': key}})
        labels = response_r['Labels']
        print(labels)
        
        custom_labels = []
        for label in labels:
            custom_labels.append(label['Name'])
            
        response = s3.head_object(Bucket=bucket, Key=key)
        timeStamp = response['LastModified'].isoformat()
        
        indexmetadata = response['Metadata']
        print("Metadata", indexmetadata)
        
        image_custom_labels = indexmetadata["customlabels"].split(",")
        
        custom_labels += image_custom_labels
        custom_labels = list(set(custom_labels))
        
        print("All labels:", custom_labels)
        
        format={
            'objectKey':image,
            'bucket':bucket,
            'createdTimeStamp':timeStamp,
            'labels':custom_labels
        }
        
        jsonBody = json.dumps(format)
        print(jsonBody)
        
        url = HOST + '/' + INDEX + '/_doc'
        print(url)
        headers = { "Content-Type": "application/json" }
        print(headers)
        # r = requests.post(url, auth=auth, data=jsonBody)
        # # , headers=headers)
        # print(r)
        
        osClient = OpenSearch(
        hosts=[{'host': str(HOST), 'port':443}],
        use_ssl=True,
        http_auth=auth,
        verify_certs=True,
        connection_class=RequestsHttpConnection)
        
        temp=osClient.index(index='photos', body=format)
        print(temp)
        
        return response['ContentType']
    except Exception as e:
        print(e)
        print('Error getting object {} from bucket {}. Make sure they exist and your bucket is in the same region as this function.'.format(key, bucket))
        raise e