# S3 Setup for Bingo Card Images

This document explains how to set up AWS S3 for storing bingo card tile images.

## Overview

Bingo card images are now stored in S3 instead of DynamoDB to avoid the 400KB item size limit. DynamoDB stores only the S3 URL for each tile.

## Prerequisites

1. AWS Account with S3 access
2. IAM user with S3 permissions (see below)
3. S3 bucket created

## Step 1: Create S3 Bucket

S3 buckets have been created:
- `sydplove-bingo-card-dev` (for development)
- `sydplove-bingo-card-prod` (for production)

These buckets are already configured with public read access. If you need to create them again:

```bash
aws s3 mb s3://sydplove-bingo-card-dev --region us-east-1
aws s3 mb s3://sydplove-bingo-card-prod --region us-east-1
```

## Step 2: Configure Bucket for Public Read Access

Since images need to be accessible from the web app, configure the bucket for public read access:

### Option A: Public Read (Simpler)

1. Go to S3 Console → Your Bucket → Permissions
2. **Block Public Access**: Uncheck "Block all public access" (or configure as needed)
3. **Bucket Policy**: Add this policy:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "PublicReadGetObject",
      "Effect": "Allow",
      "Principal": "*",
      "Action": "s3:GetObject",
      "Resource": "arn:aws:s3:::sydplove-bingo-card-dev/*"
    }
  ]
}
```

The buckets `sydplove-bingo-card-dev` and `sydplove-bingo-card-prod` are already configured with this policy.

### Option B: CORS Configuration

CORS has been configured on both buckets to allow requests from any origin. If you need to restrict it to specific domains, update the CORS configuration:

```bash
aws s3api put-bucket-cors --bucket sydplove-bingo-card-dev --cors-configuration file://cors-config.json --region us-east-1
```

Example `cors-config.json`:
```json
{
  "CORSRules": [
    {
      "AllowedHeaders": ["*"],
      "AllowedMethods": ["GET", "PUT", "POST", "DELETE", "HEAD"],
      "AllowedOrigins": ["*"],
      "ExposeHeaders": ["ETag"],
      "MaxAgeSeconds": 3000
    }
  ]
}
```

**Note**: CORS is already configured on both `sydplove-bingo-card-dev` and `sydplove-bingo-card-prod` buckets.

## Step 3: Update IAM Permissions

Your IAM user needs S3 permissions. Add this to your IAM policy:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "s3:PutObject",
        "s3:GetObject",
        "s3:DeleteObject",
        "s3:PutObjectAcl"
      ],
      "Resource": [
        "arn:aws:s3:::sydplove-bingo-card-dev/*",
        "arn:aws:s3:::sydplove-bingo-card-prod/*"
      ]
    },
    {
      "Effect": "Allow",
      "Action": [
        "s3:ListBucket"
      ],
      "Resource": [
        "arn:aws:s3:::sydplove-bingo-card-dev",
        "arn:aws:s3:::sydplove-bingo-card-prod"
      ]
    }
  ]
}
```

**Important**: Replace the bucket ARNs with your actual bucket names.

## Step 4: Environment Variables

The S3 bucket name defaults to `sydplove-bingo-card-{ENV}` based on your `VITE_ENVIRONMENT`.

You can optionally override it in your `.env` file:

```env
# S3 Configuration (optional - defaults to sydplove-bingo-card-{ENV})
VITE_S3_BUCKET_NAME=sydplove-bingo-card-dev
```

## Step 5: Test

1. Upload an image to a bingo tile
2. Check that the image appears on the tile
3. Verify the image URL in DynamoDB (should be an S3 URL, not base64)

## Troubleshooting

### CORS Errors

If you see CORS errors in the browser console:
1. Check that CORS is configured on your S3 bucket
2. Verify the bucket policy allows public read access
3. Check that the bucket region matches your `VITE_AWS_REGION`

### Access Denied Errors

If you see access denied errors:
1. Verify IAM user has S3 permissions (see Step 3)
2. Check that the bucket name in `.env` matches the actual bucket name
3. Verify the bucket exists in the correct region

### Images Not Displaying

If images don't display:
1. Check that the S3 URL is correct (check DynamoDB item)
2. Verify the bucket has public read access
3. Check browser console for 403/404 errors
4. Try accessing the S3 URL directly in a browser

## Fallback Behavior

If S3 upload fails, the app will:
- Fall back to storing base64 data in localStorage (not synced)
- Show a warning message
- Still allow local use, but images won't sync across devices

## Security Notes

⚠️ **Important**: The current implementation uses client-side AWS credentials, which has security implications (see `SECURITY_WARNING.md`). For production:

1. Consider using presigned URLs instead of public read access
2. Move to a backend API for S3 operations
3. Implement proper authentication/authorization

