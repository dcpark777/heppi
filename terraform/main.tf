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

  # Allow HTTP traffic
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

  # Allow application port (3000) - optional, can be removed if using reverse proxy
  ingress {
    from_port   = 3000
    to_port     = 3000
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
    description = "Heppi app port"
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

  vpc_security_group_ids = [aws_security_group.heppi_sg.id]

  user_data = <<-EOF
              #!/bin/bash
              # Update system
              dnf update -y
              
              # Install Docker
              dnf install -y docker
              systemctl start docker
              systemctl enable docker
              
              # Install Docker Compose (optional, for easier management)
              curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
              chmod +x /usr/local/bin/docker-compose
              
              # Add ec2-user to docker group
              usermod -aG docker ec2-user
              
              # Install Git
              dnf install -y git
              
              # Clone and run the application (you'll need to set this up)
              # For now, this is a placeholder
              echo "Heppi instance is ready!"
              EOF

  tags = {
    Name = "heppi-app"
  }
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

