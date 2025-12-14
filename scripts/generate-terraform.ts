import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import yaml from 'yaml';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const yamlPath = path.resolve(__dirname, '..', 'gcp', 'network-contract.yaml');
const outDir = path.resolve(__dirname, '..', 'gcp');
const outPath = path.join(outDir, 'main.tf');

if (!fs.existsSync(yamlPath)) {
  console.error('Missing network-contract.yaml.');
  process.exit(1);
}

type NetworkContract = {
  project?: string;
  region?: string;
  vpc: {
    name: string;
    auto_create_subnetworks?: boolean;
    subnets: Array<{ name: string; region: string; ip_cidr_range: string }>;
  };
  connectors?: Array<{ name: string; region: string; ip_cidr_range: string }>;
  secrets?: Array<{ name: string; replication?: 'automatic' | 'user-managed' }>;
  iam_bindings?: Array<{ role: string; members: string[] }>;
};

const raw = fs.readFileSync(yamlPath, 'utf8');
const contract = yaml.parse(raw) as NetworkContract;
const region = contract.region || contract.vpc?.subnets?.[0]?.region || process.env.GCP_REGION || 'us-central1';

const tfLines: string[] = [];
tfLines.push(`terraform {
  required_providers {
    google = {
      source  = "hashicorp/google"
      version = ">= 4.0"
    }
  }
}

provider "google" {
  project = var.project_id
  region  = var.region
}

variable "project_id" {
  type = string
}

variable "region" {
  type    = string
  default = "${region}"
}

locals {
  network_name = "${contract.vpc.name}"
}

resource "google_compute_network" "vpc" {
  name                    = local.network_name
  auto_create_subnetworks = ${contract.vpc.auto_create_subnetworks ? 'true' : 'false'}
}
`);

for (const subnet of contract.vpc.subnets || []) {
  tfLines.push(`resource "google_compute_subnetwork" "${subnet.name}" {
  name          = "${subnet.name}"
  ip_cidr_range = "${subnet.ip_cidr_range}"
  region        = "${subnet.region}"
  network       = google_compute_network.vpc.self_link
}
`);
}

if (contract.connectors && contract.connectors.length > 0) {
  for (const connector of contract.connectors) {
    tfLines.push(`resource "google_vpc_access_connector" "${connector.name}" {
  name               = "${connector.name}"
  region             = "${connector.region}"
  network            = google_compute_network.vpc.name
  ip_cidr_range      = "${connector.ip_cidr_range}"
  min_throughput     = 200
  max_throughput     = 300
}
`);
  }
}

if (contract.secrets && contract.secrets.length > 0) {
  for (const secret of contract.secrets) {
    const replication = secret.replication === 'user-managed' ? 'user_managed' : 'automatic';
    tfLines.push(`resource "google_secret_manager_secret" "${secret.name}" {
  secret_id = "${secret.name}"
  replication {
    ${replication === 'automatic' ? 'automatic {}' : 'user_managed {}'}
  }
}
`);
  }
}

if (contract.iam_bindings && contract.iam_bindings.length > 0) {
  contract.iam_bindings.forEach((binding, index) => {
    binding.members.forEach((member) => {
      tfLines.push(`resource "google_project_iam_member" "binding_${index}_${member.replace(/[^a-zA-Z0-9]/g, '_')}" {
  project = var.project_id
  role    = "${binding.role}"
  member  = "${member}"
}
`);
    });
  });
}

const tf = tfLines.join('\n');
fs.writeFileSync(outPath, tf, 'utf8');
console.log(`Generated Terraform configuration at ${outPath}`);
