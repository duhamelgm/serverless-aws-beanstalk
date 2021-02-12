import BbPromise from "bluebird";
import path from "path";
import fs from "fs";
import {
  getS3Instance,
  emptyS3Directory,
  getElasticBeanstalkInstance,
} from "./aws";
import { zipDirectory } from "./files";

module.exports = class Plugin {
  constructor(serverless, options) {
    this.serverless = serverless;
    this.options = options;
    this.servicePath = this.serverless.config.servicePath;
    this.logger = this.serverless.cli;
    this.service = this.serverless.service;
    this.provider = this.serverless.getProvider("aws");

    this.tmpDir = path.join(this.servicePath, "/.serverless");
    this.artifactTmpDir = path.join(this.tmpDir, "./artifacts");

    if (this.service.custom) {
      this.config = this.service.custom["elastic-beanstalk"];
    }

    this.getS3Instance = getS3Instance;
    this.getElasticBeanstalkInstance = getElasticBeanstalkInstance;

    this.hooks = {
      "after:deploy:deploy": () => BbPromise.bind(this).then(() => this.init()),
      "before:remove:remove": () =>
        BbPromise.bind(this).then(() => this.remove()),
    };
  }

  async init() {
    const res = await this.provider.request(
      "CloudFormation",
      "describeStacks",
      {
        StackName: `${this.service.getServiceName()}-${this.provider.getStage()}`,
      },
      this.provider.getStage(),
      this.provider.getRegion()
    );

    const stack = res.Stacks.pop() || { Outputs: [] };
    const output = stack.Outputs || [];

    const config = output.reduce(
      (obj, item) => Object.assign(obj, { [item.OutputKey]: item.OutputValue }),
      {}
    );

    if (!fs.existsSync(this.artifactTmpDir)) {
      fs.mkdirSync(this.artifactTmpDir);
    }

    const version = Math.floor(new Date().valueOf() / 1000).toString();

    this.config.forEach(async (item) => {
      const applicationName = config[item.applicationName];
      const environmentName = config[item.environmentName];
      const versionLabel = `${applicationName}-${version}`;
      const fileName = `bundle-${versionLabel}.zip`;

      await zipDirectory(
        path.join(process.cwd(), item.rootDir),
        `${this.artifactTmpDir}/${fileName}`
      );

      const bundlePath = path.resolve(this.artifactTmpDir, fileName);

      const S3 = getS3Instance(this.serverless, this.options.region);

      await S3.upload({
        Body: fs.createReadStream(bundlePath),
        Bucket: config.ServerlessDeploymentBucketName,
        Key: "eb/" + fileName,
      }).promise();

      const EB = getElasticBeanstalkInstance(
        this.serverless,
        this.options.region
      );

      await EB.createApplicationVersion({
        ApplicationName: applicationName,
        Process: true,
        SourceBundle: {
          S3Bucket: config.ServerlessDeploymentBucketName,
          S3Key: "eb/" + fileName,
        },
        VersionLabel: versionLabel,
      }).promise(),
        this.logger.log("Waiting for application version...");

      let updated = false;

      while (!updated) {
        const response = await EB.describeApplicationVersions({
          VersionLabels: [versionLabel],
        }).promise();

        this.logger.log(JSON.stringify(response));

        if (response.ApplicationVersions[0].Status === "PROCESSED") {
          updated = true;
        } else if (response.ApplicationVersions[0].Status === "FAILED") {
          throw new Error("Creating Application Version Failed");
        } else {
          await BbPromise.delay(5000);
        }
      }

      this.logger.log("New Application Version Created Successfully");
      this.logger.log("Updating Application Environment...");

      this.logger.log(
        JSON.stringify(
          await EB.updateEnvironment({
            ApplicationName: applicationName,
            EnvironmentName: environmentName,
            VersionLabel: versionLabel,
          }).promise()
        )
      );

      this.logger.log("Waiting for environment...");

      updated = false;

      while (!updated) {
        const response = await EB.describeEnvironments({
          EnvironmentNames: [environmentName],
        }).promise();

        this.logger.log(JSON.stringify(response));

        if (response.Environments[0].Status === "Ready") {
          updated = true;
        } else {
          await BbPromise.delay(5000);
        }
      }

      this.logger.log("Application Environment Updated Successfully");
      this.logger.log("Application Deployed Successfully");
    });
  }

  async remove() {
    const res = await this.provider.request(
      "CloudFormation",
      "describeStacks",
      {
        StackName: `${this.service.getServiceName()}-${this.provider.getStage()}`,
      },
      this.provider.getStage(),
      this.provider.getRegion()
    );

    const stack = res.Stacks.pop() || { Outputs: [] };
    const output = stack.Outputs || [];

    const config = output.reduce(
      (obj, item) => Object.assign(obj, { [item.OutputKey]: item.OutputValue }),
      {}
    );

    const S3 = getS3Instance(this.serverless, this.options.region);

    emptyS3Directory(S3, config.ServerlessDeploymentBucketName, "eb/");
  }
};
