import * as cdk from 'aws-cdk-lib';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as cloudfront from 'aws-cdk-lib/aws-cloudfront';
import * as origins from 'aws-cdk-lib/aws-cloudfront-origins';
import * as sfn from 'aws-cdk-lib/aws-stepfunctions';
import * as tasks from 'aws-cdk-lib/aws-stepfunctions-tasks';
import * as sns from 'aws-cdk-lib/aws-sns';
import * as subscriptions from 'aws-cdk-lib/aws-sns-subscriptions';
import * as wafv2 from 'aws-cdk-lib/aws-wafv2';
import { Construct } from 'constructs';

export class InsightLensStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // S3 Buckets
    const imagesBucket = new s3.Bucket(this, 'ImagesBucket', {
      encryption: s3.BucketEncryption.S3_MANAGED,
      cors: [{
        allowedMethods: [s3.HttpMethods.GET, s3.HttpMethods.PUT, s3.HttpMethods.POST],
        allowedOrigins: ['*'],
        allowedHeaders: ['*'],
        maxAge: 3000,
      }],
      lifecycleRules: [{
        transitions: [{
          storageClass: s3.StorageClass.INTELLIGENT_TIERING,
          transitionAfter: cdk.Duration.days(0),
        }],
      }],
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
    });

    const resultsBucket = new s3.Bucket(this, 'ResultsBucket', {
      encryption: s3.BucketEncryption.S3_MANAGED,
      lifecycleRules: [{
        transitions: [{
          storageClass: s3.StorageClass.INTELLIGENT_TIERING,
          transitionAfter: cdk.Duration.days(0),
        }],
      }],
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
    });

    const websiteBucket = new s3.Bucket(this, 'WebsiteBucket', {
      websiteIndexDocument: 'index.html',
      websiteErrorDocument: 'index.html',
      publicReadAccess: false,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
    });

    // DynamoDB Table
    const analysisTable = new dynamodb.Table(this, 'AnalysisTable', {
      partitionKey: { name: 'analysisId', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'timestamp', type: dynamodb.AttributeType.NUMBER },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    analysisTable.addGlobalSecondaryIndex({
      indexName: 'UserIndex',
      partitionKey: { name: 'userId', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'timestamp', type: dynamodb.AttributeType.NUMBER },
    });

    // SNS Topic for Feedback
    const feedbackTopic = new sns.Topic(this, 'FeedbackTopic', {
      displayName: 'InsightLens Feedback',
    });

    feedbackTopic.addSubscription(
      new subscriptions.EmailSubscription('rishiavantar@gmail.com')
    );

    // Lambda Functions
    const uploadHandler = new lambda.Function(this, 'UploadHandler', {
      runtime: lambda.Runtime.PYTHON_3_12,
      architecture: lambda.Architecture.ARM_64,
      handler: 'index.handler',
      code: lambda.Code.fromAsset('lambda/upload-handler'),
      environment: {
        IMAGES_BUCKET: imagesBucket.bucketName,
        ANALYSIS_TABLE: analysisTable.tableName,
      },
      timeout: cdk.Duration.seconds(30),
      memorySize: 512,
    });

    const rekognitionAnalyzer = new lambda.Function(this, 'RekognitionAnalyzer', {
      runtime: lambda.Runtime.PYTHON_3_12,
      architecture: lambda.Architecture.ARM_64,
      handler: 'index.handler',
      code: lambda.Code.fromAsset('lambda/rekognition-analyzer'),
      environment: {
        IMAGES_BUCKET: imagesBucket.bucketName,
      },
      timeout: cdk.Duration.seconds(60),
      memorySize: 1024,
    });

    const bedrockAnalyzer = new lambda.Function(this, 'BedrockAnalyzer', {
      runtime: lambda.Runtime.PYTHON_3_12,
      architecture: lambda.Architecture.ARM_64,
      handler: 'index.handler',
      code: lambda.Code.fromAsset('lambda/bedrock-analyzer'),
      environment: {
        IMAGES_BUCKET: imagesBucket.bucketName,
        MODEL_ID: 'anthropic.claude-3-sonnet-20240229-v1:0',
      },
      timeout: cdk.Duration.seconds(120),
      memorySize: 2048,
    });

    const textractAnalyzer = new lambda.Function(this, 'TextractAnalyzer', {
      runtime: lambda.Runtime.PYTHON_3_12,
      architecture: lambda.Architecture.ARM_64,
      handler: 'index.handler',
      code: lambda.Code.fromAsset('lambda/textract-analyzer'),
      environment: {
        IMAGES_BUCKET: imagesBucket.bucketName,
      },
      timeout: cdk.Duration.seconds(60),
      memorySize: 1024,
    });

    const resultsAggregator = new lambda.Function(this, 'ResultsAggregator', {
      runtime: lambda.Runtime.PYTHON_3_12,
      architecture: lambda.Architecture.ARM_64,
      handler: 'index.handler',
      code: lambda.Code.fromAsset('lambda/results-aggregator'),
      environment: {
        RESULTS_BUCKET: resultsBucket.bucketName,
        ANALYSIS_TABLE: analysisTable.tableName,
      },
      timeout: cdk.Duration.seconds(30),
      memorySize: 512,
    });

    const queryHandler = new lambda.Function(this, 'QueryHandler', {
      runtime: lambda.Runtime.PYTHON_3_12,
      architecture: lambda.Architecture.ARM_64,
      handler: 'index.handler',
      code: lambda.Code.fromAsset('lambda/query-handler'),
      environment: {
        ANALYSIS_TABLE: analysisTable.tableName,
        RESULTS_BUCKET: resultsBucket.bucketName,
      },
      timeout: cdk.Duration.seconds(30),
      memorySize: 512,
    });

    const startAnalysisHandler = new lambda.Function(this, 'StartAnalysisHandler', {
      runtime: lambda.Runtime.PYTHON_3_12,
      architecture: lambda.Architecture.ARM_64,
      handler: 'index.handler',
      code: lambda.Code.fromAsset('lambda/start-analysis'),
      environment: {
        IMAGES_BUCKET: imagesBucket.bucketName,
      },
      timeout: cdk.Duration.seconds(30),
      memorySize: 512,
    });

    const feedbackHandler = new lambda.Function(this, 'FeedbackHandler', {
      runtime: lambda.Runtime.PYTHON_3_12,
      architecture: lambda.Architecture.ARM_64,
      handler: 'index.handler',
      code: lambda.Code.fromAsset('lambda/feedback-handler'),
      environment: {
        FEEDBACK_TOPIC_ARN: feedbackTopic.topicArn,
      },
      timeout: cdk.Duration.seconds(10),
      memorySize: 256,
    });

    // Grant permissions
    imagesBucket.grantReadWrite(uploadHandler);
    imagesBucket.grantRead(rekognitionAnalyzer);
    imagesBucket.grantRead(bedrockAnalyzer);
    imagesBucket.grantRead(textractAnalyzer);
    imagesBucket.grantRead(startAnalysisHandler);
    resultsBucket.grantWrite(resultsAggregator);
    resultsBucket.grantRead(queryHandler);
    analysisTable.grantReadWriteData(uploadHandler);
    analysisTable.grantReadWriteData(resultsAggregator);
    analysisTable.grantReadData(queryHandler);

    rekognitionAnalyzer.addToRolePolicy(new iam.PolicyStatement({
      actions: ['rekognition:*'],
      resources: ['*'],
    }));

    bedrockAnalyzer.addToRolePolicy(new iam.PolicyStatement({
      actions: ['bedrock:InvokeModel'],
      resources: [`arn:aws:bedrock:${this.region}::foundation-model/*`],
    }));

    textractAnalyzer.addToRolePolicy(new iam.PolicyStatement({
      actions: ['textract:*'],
      resources: ['*'],
    }));

    feedbackTopic.grantPublish(feedbackHandler);

    // API Gateway API Key and Usage Plan
    const apiKey = api.addApiKey('InsightLensApiKey', {
      apiKeyName: 'InsightLensKey',
      description: 'API Key for InsightLens application',
    });

    const usagePlan = api.addUsagePlan('InsightLensUsagePlan', {
      name: 'InsightLens Usage Plan',
      description: 'Usage plan with rate limiting',
      throttle: {
        rateLimit: 100,  // requests per second
        burstLimit: 200, // max concurrent requests
      },
      quota: {
        limit: 10000,    // requests per month
        period: apigateway.Period.MONTH,
      },
    });

    usagePlan.addApiKey(apiKey);
    usagePlan.addApiStage({
      stage: api.deploymentStage,
    });

    // Step Functions
    const rekognitionTask = new tasks.LambdaInvoke(this, 'RekognitionAnalysis', {
      lambdaFunction: rekognitionAnalyzer,
      outputPath: '$.Payload',
    });

    const bedrockTask = new tasks.LambdaInvoke(this, 'BedrockAnalysis', {
      lambdaFunction: bedrockAnalyzer,
      outputPath: '$.Payload',
    });

    const textractTask = new tasks.LambdaInvoke(this, 'TextractAnalysis', {
      lambdaFunction: textractAnalyzer,
      outputPath: '$.Payload',
    });

    const aggregateTask = new tasks.LambdaInvoke(this, 'AggregateResults', {
      lambdaFunction: resultsAggregator,
      outputPath: '$.Payload',
    });

    const skipTextract = new sfn.Pass(this, 'SkipTextract', {
      result: sfn.Result.fromObject({ textractResults: null }),
      resultPath: '$.textractResults',
    });

    const checkForText = new sfn.Choice(this, 'HasTextDetected?')
      .when(sfn.Condition.isPresent('$.rekognitionResults.textDetections'), textractTask.next(aggregateTask))
      .otherwise(skipTextract.next(aggregateTask));

    const parallel = new sfn.Parallel(this, 'ParallelAnalysis', {
      resultPath: '$.analysisResults',
    });

    parallel.branch(rekognitionTask);
    parallel.branch(bedrockTask);

    const definition = parallel
      .next(new sfn.Pass(this, 'MergeResults', {
        parameters: {
          'analysisId.$': '$.analysisId',
          'imageKey.$': '$.imageKey',
          'userId.$': '$.userId',
          'rekognitionResults.$': '$.analysisResults[0].rekognitionResults',
          'bedrockResults.$': '$.analysisResults[1].bedrockResults',
        },
      }))
      .next(checkForText);

    const stateMachine = new sfn.StateMachine(this, 'AnalysisStateMachine', {
      definition,
      timeout: cdk.Duration.minutes(5),
    });

    uploadHandler.addEnvironment('STATE_MACHINE_ARN', stateMachine.stateMachineArn);
    startAnalysisHandler.addEnvironment('STATE_MACHINE_ARN', stateMachine.stateMachineArn);
    stateMachine.grantStartExecution(uploadHandler);
    stateMachine.grantStartExecution(startAnalysisHandler);

    // API Gateway with API Key requirement
    const api = new apigateway.RestApi(this, 'InsightLensApi', {
      restApiName: 'InsightLens API',
      defaultCorsPreflightOptions: {
        allowOrigins: apigateway.Cors.ALL_ORIGINS,
        allowMethods: apigateway.Cors.ALL_METHODS,
        allowHeaders: ['Content-Type', 'Authorization', 'X-API-Key'],
      },
      deployOptions: {
        stageName: 'prod',
        throttlingRateLimit: 100,
        throttlingBurstLimit: 200,
      },
    });

    const upload = api.root.addResource('upload');
    upload.addMethod('POST', new apigateway.LambdaIntegration(uploadHandler), {
      apiKeyRequired: true,
    });

    const startAnalysis = api.root.addResource('start-analysis');
    startAnalysis.addMethod('POST', new apigateway.LambdaIntegration(startAnalysisHandler), {
      apiKeyRequired: true,
    });

    const analysis = api.root.addResource('analysis');
    analysis.addResource('{analysisId}').addMethod('GET', new apigateway.LambdaIntegration(queryHandler), {
      apiKeyRequired: true,
    });

    const history = api.root.addResource('history');
    history.addMethod('GET', new apigateway.LambdaIntegration(queryHandler), {
      apiKeyRequired: true,
    });

    const feedback = api.root.addResource('feedback');
    feedback.addMethod('POST', new apigateway.LambdaIntegration(feedbackHandler), {
      apiKeyRequired: true,
    });

    // CloudFront WAF WebACL
    const webAcl = new wafv2.CfnWebACL(this, 'CloudFrontWAF', {
      scope: 'CLOUDFRONT',
      defaultAction: { allow: {} },
      visibilityConfig: {
        sampledRequestsEnabled: true,
        cloudWatchMetricsEnabled: true,
        metricName: 'InsightLensWAF',
      },
      rules: [
        {
          name: 'RateLimitRule',
          priority: 1,
          statement: {
            rateBasedStatement: {
              limit: 2000,
              aggregateKeyType: 'IP',
            },
          },
          action: { block: {} },
          visibilityConfig: {
            sampledRequestsEnabled: true,
            cloudWatchMetricsEnabled: true,
            metricName: 'RateLimitRule',
          },
        },
        {
          name: 'AWSManagedRulesCommonRuleSet',
          priority: 2,
          statement: {
            managedRuleGroupStatement: {
              vendorName: 'AWS',
              name: 'AWSManagedRulesCommonRuleSet',
            },
          },
          overrideAction: { none: {} },
          visibilityConfig: {
            sampledRequestsEnabled: true,
            cloudWatchMetricsEnabled: true,
            metricName: 'AWSManagedRulesCommonRuleSet',
          },
        },
        {
          name: 'AWSManagedRulesKnownBadInputsRuleSet',
          priority: 3,
          statement: {
            managedRuleGroupStatement: {
              vendorName: 'AWS',
              name: 'AWSManagedRulesKnownBadInputsRuleSet',
            },
          },
          overrideAction: { none: {} },
          visibilityConfig: {
            sampledRequestsEnabled: true,
            cloudWatchMetricsEnabled: true,
            metricName: 'AWSManagedRulesKnownBadInputsRuleSet',
          },
        },
      ],
    });

    // CloudFront
    const oai = new cloudfront.OriginAccessIdentity(this, 'OAI');
    websiteBucket.grantRead(oai);

    const distribution = new cloudfront.Distribution(this, 'Distribution', {
      defaultBehavior: {
        origin: origins.S3BucketOrigin.withOriginAccessControl(websiteBucket),
        viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
      },
      defaultRootObject: 'index.html',
      errorResponses: [{
        httpStatus: 404,
        responseHttpStatus: 200,
        responsePagePath: '/index.html',
      }],
      webAclId: webAcl.attrArn,
    });

    // Outputs
    new cdk.CfnOutput(this, 'ApiUrl', { value: api.url });
    new cdk.CfnOutput(this, 'ApiKeyId', { value: apiKey.keyId });
    new cdk.CfnOutput(this, 'CloudFrontUrl', { value: `https://${distribution.distributionDomainName}` });
    new cdk.CfnOutput(this, 'ImagesBucketName', { value: imagesBucket.bucketName });
    new cdk.CfnOutput(this, 'WebsiteBucketName', { value: websiteBucket.bucketName });
  }
}
