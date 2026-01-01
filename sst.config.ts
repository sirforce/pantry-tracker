import { NextjsSite } from "sst";
import { RetentionDays } from "aws-cdk-lib/aws-logs";
import * as cdk from "aws-cdk-lib";
import * as cf from "aws-cdk-lib/aws-cloudfront";

export default {
  config(_input) {
    return {
      name: "pantry-tracker",
      region: "us-east-1",
    };
  },
  stacks(app) {
    app.stack(function Site({ stack }) {
      const requiredEnv = [
        "DATABASE_URL",
        "NEXTAUTH_URL",
        "NEXTAUTH_SECRET",
        "GOOGLE_ID",
        "GOOGLE_SECRET",
      ] as const;

      for (const key of requiredEnv) {
        if (!process.env[key]) {
          throw new Error(`Missing required environment variable: ${key}`);
        }
      }

      const serverCachePolicy = new cf.CachePolicy(stack, "ServerCache", {
        queryStringBehavior: cf.CacheQueryStringBehavior.all(),
        headerBehavior: cf.CacheHeaderBehavior.none(),
        cookieBehavior: cf.CacheCookieBehavior.none(),
        defaultTtl: cdk.Duration.days(0),
        maxTtl: cdk.Duration.days(365),
        minTtl: cdk.Duration.days(0),
        enableAcceptEncodingBrotli: true,
        enableAcceptEncodingGzip: true,
      });

      const site = new NextjsSite(stack, "site", {
        // customDomain: {
        //   domainName: "webdevcody.com",
        //   domainAlias: "www.ytchaptersgenerator.com",
        // },
        cdk: {
          serverCachePolicy,
          server: {
            logRetention: RetentionDays.ONE_MONTH,
          },
        },
        environment: {
          DATABASE_URL: process.env.DATABASE_URL!,
          NEXTAUTH_URL: process.env.NEXTAUTH_URL!,
          NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET!,
          GOOGLE_ID: process.env.GOOGLE_ID!,
          GOOGLE_SECRET: process.env.GOOGLE_SECRET!,
          AUTH_TRUST_HOST: "true",
        },
      });

      stack.addOutputs({
        SiteUrl: site.url,
      });
    });
  },
};
