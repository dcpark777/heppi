# Terraform Configuration for Heppi

This directory contains Terraform configuration to deploy Heppi to AWS EC2 using the free tier.

## Prerequisites

1. AWS account with free tier eligibility
2. AWS CLI configured with credentials
3. Terraform installed (>= 1.0)
4. An EC2 Key Pair created in AWS

## Setup

1. Create an EC2 Key Pair in AWS:
   ```bash
   aws ec2 create-key-pair --key-name heppi-key --query 'KeyMaterial' --output text > heppi-key.pem
   chmod 400 heppi-key.pem
   ```

2. Copy the example variables file:
   ```bash
   cp terraform.tfvars.example terraform.tfvars
   ```

3. Edit `terraform.tfvars` with your values:
   ```hcl
   aws_region    = "us-east-1"
   key_pair_name = "heppi-key"
   ```

## Deployment

1. Initialize Terraform:
   ```bash
   terraform init
   ```

2. Review the plan:
   ```bash
   terraform plan
   ```

3. Apply the configuration:
   ```bash
   terraform apply
   ```

4. After deployment, you'll see outputs with the instance IP and DNS.

## Deploying the Application

After the EC2 instance is created:

1. SSH into the instance:
   ```bash
   ssh -i heppi-key.pem ec2-user@<instance-ip>
   ```

2. Clone your repository or copy your application files

3. Build and run with Docker:
   ```bash
   docker build -t heppi .
   docker run -d -p 3000:3000 --name heppi-app heppi
   ```

## Cost

- **EC2 t2.micro**: Free for 12 months (750 hours/month) for new AWS accounts
- **Data transfer**: First 1 GB/month free, then $0.09/GB
- **Storage**: 30 GB free (EBS General Purpose SSD)

**Total estimated cost: $0/month** (within free tier limits)

## Cleanup

To destroy all resources:
```bash
terraform destroy
```

