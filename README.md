# InsightLens 🔍

**Advanced Serverless AI/ML Multi-Modal Image Analysis Platform**

A production-ready serverless application that performs comprehensive AI analysis on uploaded images using Amazon Bedrock's Claude 3 with vision capabilities, Amazon Rekognition for specialized detection, and Amazon Textract for document text extraction.

![Architecture](https://img.shields.io/badge/AWS-Serverless-orange) ![Cost](https://img.shields.io/badge/Cost-$0--2%2Fmonth-green) ![AI](https://img.shields.io/badge/AI-Multi--Modal-blue)

## 🌟 Features

### AI-Powered Analysis
- **Amazon Bedrock Claude 3 Sonnet**: Creative image descriptions, scene understanding, safety analysis
- **Amazon Rekognition**: Object/scene detection, text recognition, face analysis, celebrity recognition, content moderation
- **Amazon Textract**: Advanced document text extraction with high accuracy
- **Intelligent Routing**: Automatically determines which AI services to use based on image content

### User Experience
- **Drag & Drop Upload**: Modern, intuitive image upload interface
- **Real-time Progress**: Live analysis status tracking
- **Interactive Dashboard**: Visual results with categorized insights
- **Analysis History**: Browse and search previous analyses
- **Responsive Design**: Works seamlessly on desktop and mobile

### Architecture Highlights
- **100% Serverless**: Zero idle costs, infinite scalability
- **Step Functions Orchestration**: Parallel AI service execution with error handling
- **ARM64 Graviton**: 20% cost savings on Lambda functions
- **S3 Intelligent-Tiering**: Automatic storage cost optimization
- **CloudFront CDN**: Global content delivery with caching

## 🏗️ Architecture

```
┌─────────────┐
│   React     │
│   Frontend  │
│ (CloudFront)│
└──────┬──────┘
       │
       ▼
┌─────────────┐
│ API Gateway │
└──────┬──────┘
       │
       ├──────────────────┬──────────────────┐
       ▼                  ▼                  ▼
┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│   Upload    │    │   Query     │    │  History    │
│   Lambda    │    │   Lambda    │    │   Lambda    │
└──────┬──────┘    └─────────────┘    └─────────────┘
       │
       ▼
┌─────────────────────────────────────────────────┐
│          Step Functions State Machine           │
│                                                  │
│  ┌──────────────┐         ┌──────────────┐     │
│  │ Rekognition  │ Parallel│   Bedrock    │     │
│  │   Lambda     │◄───────►│   Lambda     │     │
│  └──────────────┘         └──────────────┘     │
│         │                                        │
│         ▼                                        │
│  ┌──────────────┐                               │
│  │  Textract    │ (Conditional)                 │
│  │   Lambda     │                               │
│  └──────────────┘                               │
│         │                                        │
│         ▼                                        │
│  ┌──────────────┐                               │
│  │  Aggregator  │                               │
│  │   Lambda     │                               │
│  └──────────────┘                               │
└─────────────────────────────────────────────────┘
       │
       ▼
┌─────────────┬─────────────┐
│     S3      │  DynamoDB   │
│  (Results)  │  (Metadata) │
└─────────────┴─────────────┘
```

## 🚀 Deployment

### Prerequisites
- AWS Account with appropriate permissions
- AWS CLI configured
- Node.js 18+ and npm
- AWS CDK CLI: `npm install -g aws-cdk`

### Step 1: Install Dependencies
```bash
npm install
cd frontend && npm install && cd ..
```

### Step 2: Bootstrap CDK (First time only)
```bash
cdk bootstrap
```

### Step 3: Deploy Infrastructure
```bash
cdk deploy
```

This will create:
- 3 S3 buckets (images, results, website)
- 1 DynamoDB table
- 6 Lambda functions (ARM64/Graviton)
- 1 Step Functions state machine
- 1 API Gateway
- 1 CloudFront distribution

### Step 4: Build and Deploy Frontend
```bash
cd frontend
npm run build

# Upload to S3 (replace with your bucket name from CDK output)
aws s3 sync build/ s3://YOUR-WEBSITE-BUCKET-NAME --delete
```

### Step 5: Update Frontend API URL
Edit `frontend/src/services/api.ts` and replace `API_BASE_URL` with your API Gateway URL from CDK outputs.

## 💰 Cost Optimization

### Estimated Monthly Costs (Demo Usage)
- **Lambda**: ~$0.20 (1M requests free tier)
- **S3**: ~$0.50 (5GB storage)
- **DynamoDB**: ~$0.00 (25GB free tier)
- **Bedrock**: ~$0.50 (100 images)
- **Rekognition**: ~$0.10 (5,000 images free tier)
- **CloudFront**: ~$0.00 (1TB free tier first year)
- **Total**: **$0.00 - $2.00/month**

### Cost Optimization Features
- ARM64 Graviton processors (20% cheaper)
- S3 Intelligent-Tiering (automatic cost optimization)
- DynamoDB on-demand billing (pay per request)
- Lambda with optimized memory settings
- CloudFront caching to reduce API calls

## 🎨 Frontend Features

### Vibrant UI Design
- Gradient backgrounds with purple/pink theme
- Smooth animations and transitions
- Responsive grid layouts
- Interactive hover effects
- Real-time loading states

### Components
- **ImageUploader**: Drag-and-drop with preview
- **AnalysisResults**: Categorized AI insights display
- **AnalysisHistory**: Browse previous analyses

## 🔧 Advanced Enhancements

### Suggested Additions

1. **Amazon Comprehend Integration**
   - Sentiment analysis on extracted text
   - Entity recognition in descriptions
   - Key phrase extraction

2. **Semantic Search with Embeddings**
   ```typescript
   // Add to bedrock-analyzer
   const embeddings = await bedrock.invoke({
     modelId: 'amazon.titan-embed-image-v1',
     body: { inputImage: imageBase64 }
   });
   // Store in OpenSearch or DynamoDB for similarity search
   ```

3. **Comparative Analysis**
   - Upload multiple images
   - Use Claude to compare and contrast
   - Generate comparison reports

4. **SageMaker Custom Models**
   - Deploy custom image classification models
   - Industry-specific analysis (medical, retail, etc.)

5. **Real-time Notifications**
   - SNS/SQS for analysis completion
   - WebSocket API for live updates

6. **Advanced Content Moderation**
   - Bedrock Guardrails integration
   - Custom moderation policies
   - Automated flagging system

## 📊 Step Functions Workflow

The state machine orchestrates the analysis pipeline:

1. **Parallel Execution**: Rekognition + Bedrock run simultaneously
2. **Conditional Logic**: Textract only runs if text is detected
3. **Error Handling**: Automatic retries with exponential backoff
4. **Result Aggregation**: Combines all AI outputs into unified response

## 🔐 Security Best Practices

- IAM least-privilege policies
- S3 bucket encryption at rest
- API Gateway throttling
- CloudFront HTTPS enforcement
- No hardcoded credentials
- VPC endpoints for private communication (optional)

## 📱 API Endpoints

### POST /upload
Upload image and start analysis
```json
{
  "filename": "image.jpg",
  "contentType": "image/jpeg",
  "userId": "user123"
}
```

### GET /analysis/{analysisId}
Get analysis results
```json
{
  "analysisId": "uuid",
  "status": "completed",
  "results": { ... }
}
```

### GET /history?userId={userId}
Get user's analysis history

## 🛠️ Development

### Local Testing
```bash
# Test Lambda functions locally
cd lambda/upload-handler
python index.py

# Run frontend locally
cd frontend
npm start
```

### Useful Commands
- `cdk diff` - Compare deployed stack with current state
- `cdk synth` - Emit synthesized CloudFormation template
- `cdk destroy` - Remove all resources

## 📈 Monitoring

- CloudWatch Logs for all Lambda functions
- X-Ray tracing for Step Functions
- CloudWatch Metrics for API Gateway
- S3 access logs for audit trail

## 🎯 Use Cases

- **E-commerce**: Product image analysis and categorization
- **Social Media**: Content moderation and tagging
- **Healthcare**: Medical image preliminary analysis
- **Real Estate**: Property image analysis and descriptions
- **Education**: Document digitization and analysis
- **Media**: Automated image captioning and metadata

## 🤝 Contributing

This is a showcase project demonstrating enterprise-grade serverless architecture. Feel free to fork and customize for your needs!

## 📄 License

MIT License - Feel free to use this project for learning and portfolio purposes.

## 🌐 Live Demo

Deploy this to your AWS account and share the CloudFront URL!

---

**Built with ❤️ using AWS Serverless Services**

*Perfect for showcasing your Solutions Architect expertise on LinkedIn!*
