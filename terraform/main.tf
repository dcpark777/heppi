terraform {
  required_version = ">= 1.0"
  
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

provider "aws" {
  region = var.aws_region
}

# ECR Repository for storing the container image
resource "aws_ecr_repository" "heppi" {
  name                 = "heppi"
  image_tag_mutability = "MUTABLE"

  image_scanning_configuration {
    scan_on_push = true
  }

  tags = {
    Name = "heppi-repository"
  }
}

# IAM role for EC2 instance to pull from ECR
resource "aws_iam_role" "heppi_ec2" {
  name = "heppi-ec2-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "ec2.amazonaws.com"
        }
      }
    ]
  })

  tags = {
    Name = "heppi-ec2-role"
  }
}

# IAM policy for ECR access
resource "aws_iam_role_policy" "heppi_ecr" {
  name = "heppi-ecr-policy"
  role = aws_iam_role.heppi_ec2.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "ecr:GetAuthorizationToken",
          "ecr:BatchCheckLayerAvailability",
          "ecr:GetDownloadUrlForLayer",
          "ecr:BatchGetImage"
        ]
        Resource = "*"
      }
    ]
  })
}

# Instance profile to attach the role to EC2
resource "aws_iam_instance_profile" "heppi" {
  name = "heppi-instance-profile"
  role = aws_iam_role.heppi_ec2.name
}

# Get the latest Amazon Linux 2023 AMI
data "aws_ami" "amazon_linux" {
  most_recent = true
  owners      = ["amazon"]

  filter {
    name   = "name"
    values = ["al2023-ami-*-x86_64"]
  }

  filter {
    name   = "virtualization-type"
    values = ["hvm"]
  }
}


# Security group for the EC2 instance
resource "aws_security_group" "heppi_sg" {
  name        = "heppi-security-group"
  description = "Security group for Heppi application"

  # Allow HTTP traffic (for Let's Encrypt validation and redirect)
  ingress {
    from_port   = 80
    to_port     = 80
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
    description = "HTTP"
  }

  # Allow HTTPS traffic
  ingress {
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
    description = "HTTPS"
  }

  # Allow application port (3000) - direct access for quick setup
  # Remove this and use nginx/HTTPS for production
  ingress {
    from_port   = 3000
    to_port     = 3000
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
    description = "Heppi app port (direct access)"
  }

  # Allow SSH access (restrict to your IP in production)
  ingress {
    from_port   = 22
    to_port     = 22
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"] # Change this to your IP in production
    description = "SSH"
  }

  # Allow all outbound traffic
  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
    description = "All outbound"
  }

  tags = {
    Name = "heppi-security-group"
  }
}

# EC2 instance (t2.micro is free tier eligible)
resource "aws_instance" "heppi" {
  ami           = data.aws_ami.amazon_linux.id
  instance_type = "t2.micro" # Free tier eligible
  key_name      = var.key_pair_name
  iam_instance_profile = aws_iam_instance_profile.heppi.name

  vpc_security_group_ids = [aws_security_group.heppi_sg.id]

  user_data = templatefile("${path.module}/user_data.sh", {
    subdomain      = var.subdomain
    domain_name    = var.domain_name
    full_domain     = "${var.subdomain}.${var.domain_name}"
    git_repo_url   = var.git_repo_url
    ecr_repository_url = aws_ecr_repository.heppi.repository_url
    aws_region     = var.aws_region
  })

  tags = {
    Name = "heppi-app"
  }
}

# Route53 Hosted Zone (create if hosted_zone_id is not provided)
resource "aws_route53_zone" "main" {
  count = var.hosted_zone_id == "" ? 1 : 0
  name  = var.domain_name
}

# Get existing hosted zone if hosted_zone_id is provided
data "aws_route53_zone" "existing" {
  count   = var.hosted_zone_id != "" ? 1 : 0
  zone_id = var.hosted_zone_id
}

# Local for hosted zone ID
locals {
  hosted_zone_id = var.hosted_zone_id != "" ? var.hosted_zone_id : aws_route53_zone.main[0].zone_id
  full_domain    = "${var.subdomain}.${var.domain_name}"
}

# Route53 A record pointing directly to EC2 instance
resource "aws_route53_record" "heppi" {
  zone_id = local.hosted_zone_id
  name    = local.full_domain
  type    = "A"
  ttl     = 300
  records = [aws_instance.heppi.public_ip]
}

# Output the public IP
output "instance_public_ip" {
  value       = aws_instance.heppi.public_ip
  description = "Public IP address of the Heppi instance"
}

output "instance_public_dns" {
  value       = aws_instance.heppi.public_dns
  description = "Public DNS name of the Heppi instance"
}

output "ssh_command" {
  value       = "ssh -i ~/.ssh/${var.key_pair_name}.pem ec2-user@${aws_instance.heppi.public_ip}"
  description = "SSH command to connect to the instance"
}

output "ecr_repository_url" {
  value       = aws_ecr_repository.heppi.repository_url
  description = "ECR repository URL for pushing container images"
}

output "ecr_login_command" {
  value       = "aws ecr get-login-password --region ${var.aws_region} | podman login --username AWS --password-stdin ${aws_ecr_repository.heppi.repository_url}"
  description = "Command to login to ECR with Podman"
}

output "application_url" {
  value       = "https://${local.full_domain}"
  description = "URL to access the Heppi application"
}

output "hosted_zone_id" {
  value       = local.hosted_zone_id
  description = "Route53 hosted zone ID"
}

output "name_servers" {
  value       = var.hosted_zone_id == "" ? aws_route53_zone.main[0].name_servers : data.aws_route53_zone.existing[0].name_servers
  description = "Name servers for the hosted zone (if created) - update your domain registrar with these"
}

