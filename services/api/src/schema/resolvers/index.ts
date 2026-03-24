import { authResolvers } from './auth.resolver.js';
import { userResolvers } from './user.resolver.js';
import { organizationResolvers } from './organization.resolver.js';
import { inspectionSystemResolvers } from './inspectionSystem.resolver.js';
import { journeyResolvers } from './journey.resolver.js';
import { alertResolvers } from './alert.resolver.js';
import { sensorResolvers } from './sensor.resolver.js';
import { thresholdResolvers } from './threshold.resolver.js';
import { dashboardResolvers } from './dashboard.resolver.js';
import { DateTimeResolver, JSONResolver } from 'graphql-scalars';

export const resolvers = [
  { DateTime: DateTimeResolver, JSON: JSONResolver },
  authResolvers,
  userResolvers,
  organizationResolvers,
  inspectionSystemResolvers,
  journeyResolvers,
  alertResolvers,
  sensorResolvers,
  thresholdResolvers,
  dashboardResolvers,
];
