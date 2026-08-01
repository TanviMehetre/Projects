# Project Time Application - AWS Deployment

This is Project Time Application that is deployed using AWS Serverless(Lambda, API Gateway, and RDS (PostgreSQL))
The lambda functions are written in Python, using the pg8000 driver to interact with PostgreSQL.

## Architecture Overview

**AWS Services Used:**
- **AWS Lambda** — Runs backend logic without managing servers.
- **AWS API Gateway** — Exposes RESTful endpoints for client interaction.
- **AWS RDS (PostgreSQL)** — Stores persistent application data.
- **AWS CloudFront** — Delivers static frontend assets globally with low latency and high transfer speeds.
- **AWS S3 Bucket** — Hosts static frontend files (HTML, CSS, JS) and supports CloudFront distribution.
- **AWS VPC** — Provides a secure, isolated network environment for Lambda and RDS communication.
- **AWS EC2** — Used as a bastion host to access RDS securely.  

## API Endpoints

| Method     | Endpoint             | Description                                  |
|------------|----------------------|----------------------------------------------|
| **GET**    | `/timelog`           | Retrieve all time logs                       |
| **GET**    | `/timelog/{id}`      | Retrieve a single time log by ID             |
| **POST**   | `/timelog`           | Create a new time log                        |
| **PUT**    | `/timelog/{id}`      | Update an existing time log                  |
| **DELETE** | `/timelog/{id}`      | Delete a time log                            |
| **POST**   | `/timelog/filter`    | Post filters and get the respective timelogs |
| **GET**    | `/timelog/dropdowns` | Get the dropdown options                     |

## Deployment Instructions

### Using AWS Console:

- **VPC**
  1. Create a VPC with public and private subnets.
  2. Create an internet gateway and attach it to the public subnet group.
  3. Create a NAT gateway and attach it to the private subnets.

- **API Gateway**
  1. Create an API endpoint and add the resources and methods as listed above in the API endpoints table.
  2. Proxy will be used for GET /timelog/{id}, PUT /timelog/{id}, and DELETE /timelog/{id}.

- **S3 Bucket**
  1. Create a S3 bucket that stores the static files for the application.
  2. Upload the files from the dist folder after running the npm run build command in the client folder.

- **CloudFront**
  1. Create a Cloudfront and assign the origin as the S3 bucket. 
  2. Create an invalidation and also assign the default root object to index.html file.
  3. Add the API Gateway as the origin as well.

- **Lambda Functions**
  1. Navigate to the respective lambda function folder inside the Server folder and install the dependencies using the requirements file. <br>
     pip3 install -r requirements.txt (MacOS) or pip install -r requirements.txt(Windows)
  2. Go to AWS Lambda and create the respective lambda functions provided in the Server folder.
  3. Add the zipped folder with the lambda function and the respective dependencies.
  4. Add the respective API Gateway methods as the triggers.

- **RDS Database(PostgreSQL)**
  1. Create a database and assign it to the VPC we created before.
  2. Assign private subnets to the database. The database and lambda function will reside in the private subnet.
  3. Connect the database to the lambda functions.
  4. Make sure the rds to ec2, rds to lambda and rds security groups are attached.
  5. To view the database use ssh tunneling in pgAdmin to connect to the EC2 instance and access the database.

- **EC2**
  1. Create an EC2 Instance inside the public subnet with your required configurations.
  2. Add the security groups enabling only ssh connection for inbound rules.
  3. Allow the rds database for outbound rules.

### Author: Tanvi Mehetre