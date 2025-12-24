variable "aws_region" {
  description = "AWS region to deploy resources"
  type        = string
  default     = "us-east-1" # Change to your preferred region
}

variable "key_pair_name" {
  description = "Name of the AWS key pair for SSH access"
  type        = string
  # You'll need to create a key pair in AWS EC2 console first
  # Or use: aws ec2 create-key-pair --key-name heppi-key --query 'KeyMaterial' --output text > heppi-key.pem
}

