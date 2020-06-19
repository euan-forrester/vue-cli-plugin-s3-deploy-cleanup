# vue-cli-plugin-s3-deploy-cleanup
A vue-cli plugin that helps cleanup old build artifacts from S3 by tagging them for later deletion

## Description

Each time you change a file and then build your project, files with similar -- but different -- names are created. These build artifacts have a hash appended to their filenames to differentiate them. The new `index.html` file generated then points to these new files. When you deploy them by copying them to S3 the files with the old hashes remain. Over time you may build up lots of old files like this in your bucket.

This plugin helps to clean up these files by tagging all the non-current files with a special value that S3 can then identify and delete at a later time. It's important to not delete them right away because a user may have some, but not all, of them cached in their web browser. If they have your old `index.html` file cached on their local machine, their web browser might go looking for the old hashes that it references, and if they're not there the user will see a 404.

Thus an S3 lifecycle rule can be used to delete these tagged files after a certain number of days when you're sure that no one will have them cached.

## Instructions

1. Add the `vue-cli-plugin-s3-deploy` plugin to your project: https://github.com/multiplegeorges/vue-cli-plugin-s3-deploy

2. Add this plugin to your project: `vue add vue-cli-plugin-s3-deploy-cleanup`

An S3 tag has a Key and a Value, so you will be prompted for both during the installation phase. Or you can accept the default Key = "DeployLifecycle" and Value = "DeleteMe".

You'll also get a `deploy:cleanup` npm script added that invokes this plugin.

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

    noncurrent_version_expiration {
      days = var.days_to_keep_old_versions
    }
  }

  lifecycle_rule {
    id      = "expire-tagged-files-after-N-days"
    enabled = true

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

4. Deploy your project: `yarn deploy && yarn deploy:cleanup`

You'll see a list of files that the plugin found in S3 and in the dist directory on your local machine. Any files in S3 that are not on your local machine are assumed to be old build artifacts and will be tagged with the tag your specified. They will also be copied in place so that their last modified date is updated (the lifecycle rule calculates time based on the object's last modified date, and tagging the object doesn't update this date). Their metadata will be replaced during this copy operation. Once this is done the lifecycle rule will delete them after the amount of time you specified.

## Environments

Note that you can override the cleanup tag on a per-environment basis by adding the values:

```
VUE_APP_S3D_CLEANUP_TAG_KEY = <something>
VUE_APP_S3D_CLEANUP_TAG_VALUE = <something>
```

To your `.env.<environment>` file, and then invoking the deploy with `yarn deploy --mode=<environment> && yarn deploy:cleanup --mode=<environment>`

This is the same file that holds any overrides for the `vue-cli-plugin-s3-deploy` plugin.
