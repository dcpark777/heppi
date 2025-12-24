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

variable "domain_name" {
  description = "Domain name for the application (e.g., jyjp)"
  type        = string
  default     = "jyjp"
}

variable "subdomain" {
  description = "Subdomain for the application (e.g., heppi)"
  type        = string
  default     = "heppi"
}

variable "hosted_zone_id" {
  description = "Route53 hosted zone ID for the domain (leave empty to create new hosted zone)"
  type        = string
  default     = ""
}

variable "git_repo_url" {
  description = "Git repository URL for automatic deployment (optional)"
  type        = string
  default     = ""
}

