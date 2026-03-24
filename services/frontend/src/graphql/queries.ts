import gql from 'graphql-tag';

export const LOGIN = gql`
  mutation Login($email: String!, $password: String!) {
    login(email: $email, password: $password) {
      token
      user {
        id
        name
        email
        roles
      }
    }
  }
`;

export const GET_ME = gql`
  query Me {
    me {
      id
      name
      email
      roles
    }
  }
`;

export const GET_DASHBOARD_STATS = gql`
  query DashboardStats {
    dashboardStats {
      totalSystems
      connectedSystems
      totalJourneys
      activeJourneys
      alertCounts {
        warning
        alert
        critical
      }
      recentAlerts {
        id
        metric
        severity
        pkStart
        pkEnd
        measuredValue
        thresholdValue
        detectedAt
        journey {
          name
          system {
            code
          }
        }
      }
    }
  }
`;

export const GET_JOURNEYS = gql`
  query Journeys($filter: JourneyFilter, $pagination: Pagination) {
    journeys(filter: $filter, pagination: $pagination) {
      items {
        id
        name
        startedAt
        endedAt
        status
        system {
          id
          name
          code
        }
        alertCount {
          warning
          alert
          critical
        }
      }
      pageInfo {
        page
        pageSize
        totalCount
        totalPages
      }
    }
  }
`;

export const GET_JOURNEY = gql`
  query Journey($id: Int!) {
    journey(id: $id) {
      id
      name
      startedAt
      endedAt
      status
      metadata
      system {
        id
        name
        code
      }
      alerts {
        id
        metric
        severity
        pkStart
        pkEnd
        measuredValue
        thresholdValue
        deviation
        detectedAt
      }
      alertCount {
        warning
        alert
        critical
      }
    }
  }
`;

export const GET_ALERTS = gql`
  query Alerts($filter: AlertFilter, $pagination: Pagination) {
    alerts(filter: $filter, pagination: $pagination) {
      items {
        id
        metric
        severity
        pkStart
        pkEnd
        latStart
        lonStart
        latEnd
        lonEnd
        measuredValue
        thresholdValue
        deviation
        detectedAt
        journey {
          id
          name
          system {
            code
          }
        }
      }
      pageInfo {
        page
        pageSize
        totalCount
        totalPages
      }
    }
  }
`;

export const GET_SENSOR_READINGS = gql`
  query SensorReadings($journeyId: Int!, $pkFrom: Float, $pkTo: Float, $resolution: Int) {
    sensorReadings(journeyId: $journeyId, pkFrom: $pkFrom, pkTo: $pkTo, resolution: $resolution) {
      time
      pk
      latitude
      longitude
      speed
      accelVertical
      accelLateral
      accelLongitudinal
      leveling
      alignment
      twist
      gauge
    }
  }
`;

export const GET_THRESHOLDS = gql`
  query Thresholds {
    thresholds {
      id
      metric
      warningMin
      warningMax
      alertMin
      alertMax
      criticalMin
      criticalMax
    }
  }
`;

export const GET_INSPECTION_SYSTEMS = gql`
  query InspectionSystems {
    inspectionSystems {
      id
      name
      code
      connectionStatus
      lastSeenAt
      sensorsConfig
    }
  }
`;
