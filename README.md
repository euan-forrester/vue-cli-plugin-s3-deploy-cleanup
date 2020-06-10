# vue-cli-plugin-s3-deploy-cleanup
A vue-cli plugin that helps cleanup old build artifacts from S3 by tagging them for later deletion

## Instructions

1. Add the `vue-cli-plugin-s3-deploy` plugin to your project: https://github.com/multiplegeorges/vue-cli-plugin-s3-deploy

2. Add this plugin to your project: `vue add vue-cli-plugin-s3-deploy-cleanup`

An S3 tag has a Key and a Value, so you will be prompted for both during the installation phase. Or you can accept the default Key = "DeployLifecycle" and Value = "DeleteMe".

You will also be asked whether to change your npm/yarn `deploy` script to include calling this plugin after the deploy plugin. Either way, you'll also get a `deploy:cleanup` script added that just invokes this plugin.

3. Change your S3 bucket definition to include a lifecycle rule that will delete all items with the tag above in N days.

Terraform example:

```
resource "aws_s3_bucket" "frontend" {

  [...]
  
  versioning {
    enabled = true
  }

  lifecycle_rule {
    id      = "expire-old-versions-after-N-days"
    enabled = true

    prefix = "*"

    noncurrent_version_expiration {
      days = var.days_to_keep_old_versions
    }
  }

  lifecycle_rule {
    id      = "expire-tagged-files-after-N-days"
    enabled = true

    prefix = "*"

    tags = {
      "DeployLifecycle" = "DeleteMe"
    }

    expiration {
      days = var.days_to_keep_old_versions
    }
  }
}
```

Note that we have 2 lifecycle rules: one to delete old versions of the same file, and one to delete files with our new tag. This is because some files may be deployed with the same name (e.g. `index.html`) and so will have old versions kept by S3 if versioning is enabled on the bucket.
