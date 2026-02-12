/**
 * Fraud Detection Algorithm for Reports
 * Analyzes report engagement metrics to identify potentially fraudulent or suspicious reports
 */

/**
 * Calculate fraud score based on multiple factors
 * @param {Object} report - The report object
 * @param {Object} socialStats - Social engagement statistics
 * @returns {Object} - { isFraud: boolean, score: number, reasons: string[], severity: string }
 */
export const detectFraud = (report, socialStats = null) => {
  const reasons = [];
  let fraudScore = 0;
  
  // Default social stats if not provided
  const stats = socialStats || {
    upvotes: 0,
    downvotes: 0,
    viewCount: 0,
    commentCount: 0,
    shareCount: 0
  };

  const views = stats.viewCount || 0;
  const likes = stats.upvotes || 0;
  const dislikes = stats.downvotes || 0;
  const comments = stats.commentCount || 0;
  const shares = stats.shareCount || 0;

  // Factor 1: High downvote ratio (heavily weighted)
  if (likes + dislikes > 5) {
    const dislikeRatio = dislikes / (likes + dislikes);
    if (dislikeRatio > 0.7) {
      fraudScore += 35;
      reasons.push(`High dislike ratio: ${(dislikeRatio * 100).toFixed(0)}% of votes are negative`);
    } else if (dislikeRatio > 0.5) {
      fraudScore += 20;
      reasons.push(`Concerning dislike ratio: ${(dislikeRatio * 100).toFixed(0)}% of votes are negative`);
    }
  }

  // Factor 2: Low engagement despite high views (spam indicator)
  if (views > 50) {
    const engagementRate = (likes + dislikes + comments) / views;
    if (engagementRate < 0.02 && views > 100) {
      fraudScore += 25;
      reasons.push(`Very low engagement rate: ${(engagementRate * 100).toFixed(2)}% (high views with minimal interaction)`);
    } else if (engagementRate < 0.05) {
      fraudScore += 15;
      reasons.push(`Low engagement rate: ${(engagementRate * 100).toFixed(2)}%`);
    }
  }

  // Factor 3: Abnormal view-to-like ratio
  if (views > 20 && likes > 0) {
    const viewsPerLike = views / likes;
    if (viewsPerLike > 100) {
      fraudScore += 15;
      reasons.push(`Suspicious view pattern: ${viewsPerLike.toFixed(0)} views per like (possible bot views)`);
    }
  }

  // Factor 4: Report age vs engagement (viral fraud pattern)
  if (report.createdAt) {
    const reportAge = (new Date() - new Date(report.createdAt)) / (1000 * 60 * 60); // hours
    
    if (reportAge < 2 && views > 500) {
      fraudScore += 30;
      reasons.push(`Abnormal viral growth: ${views} views in ${reportAge.toFixed(1)} hours (possible bot campaign)`);
    } else if (reportAge < 6 && views > 1000) {
      fraudScore += 25;
      reasons.push(`Suspicious rapid growth: ${views} views in ${reportAge.toFixed(1)} hours`);
    }
  }

  // Factor 5: High dislikes with very low or no likes (clear negative signal)
  if (dislikes > 10 && likes < 3) {
    fraudScore += 30;
    reasons.push(`Overwhelming negative feedback: ${dislikes} dislikes vs ${likes} likes`);
  }

  // Factor 6: No comments despite high engagement (bot indicator)
  if ((likes + dislikes) > 30 && comments === 0 && views > 100) {
    fraudScore += 20;
    reasons.push(`No organic discussion: High votes but zero comments (possible bot activity)`);
  }

  // Factor 7: Shares without engagement (fake sharing)
  if (shares > 10 && (likes + dislikes) < 5 && comments < 2) {
    fraudScore += 20;
    reasons.push(`Suspicious sharing pattern: ${shares} shares with minimal genuine engagement`);
  }

  // Factor 8: Content quality indicators (if available)
  const title = report.title || '';
  const description = report.description || '';
  
  // Check for spam keywords or patterns
  const spamPatterns = [
    /click here/i,
    /free money/i,
    /100% guarantee/i,
    /act now/i,
    /limited time/i,
    /congratulations/i,
    /you've won/i,
    /!!!+/,
    /\$\$\$+/
  ];

  const hasSpamContent = spamPatterns.some(pattern => 
    pattern.test(title) || pattern.test(description)
  );

  if (hasSpamContent) {
    fraudScore += 25;
    reasons.push('Content contains spam-like keywords or patterns');
  }

  // Factor 9: Very short or very generic content
  if (title.length < 10 || description.length < 20) {
    fraudScore += 10;
    reasons.push('Low-quality content: Very brief title or description');
  }

  // Factor 10: Duplicate-like patterns (same user making similar reports)
  // This would require backend support to check user's other reports
  // Placeholder for future enhancement

  // Determine fraud severity based on score
  let severity = 'low';
  let isFraud = false;

  if (fraudScore >= 70) {
    severity = 'critical';
    isFraud = true;
  } else if (fraudScore >= 50) {
    severity = 'high';
    isFraud = true;
  } else if (fraudScore >= 30) {
    severity = 'medium';
    isFraud = true;
  } else if (fraudScore >= 15) {
    severity = 'low';
    isFraud = false; // Don't mark as fraud but flag as suspicious
  }

  return {
    isFraud,
    score: fraudScore,
    reasons,
    severity,
    recommendation: getFraudRecommendation(fraudScore, reasons)
  };
};

/**
 * Get recommendation based on fraud score
 * @param {number} score - Fraud score
 * @returns {string} - Recommendation text
 */
const getFraudRecommendation = (score) => {
  if (score >= 70) {
    return 'IMMEDIATE ACTION REQUIRED: Strong indicators of fraudulent activity. Consider removing this report and investigating the user.';
  } else if (score >= 50) {
    return 'HIGH PRIORITY: Multiple fraud indicators detected. Review carefully and consider removal.';
  } else if (score >= 30) {
    return 'MODERATE CONCERN: Some suspicious patterns detected. Monitor closely and verify authenticity.';
  } else if (score >= 15) {
    return 'LOW PRIORITY: Minor concerns detected. Keep an eye on engagement patterns.';
  }
  return 'No significant fraud indicators detected.';
};

/**
 * Get fraud badge styling
 * @param {string} severity - Severity level (low, medium, high, critical)
 * @returns {Object} - Badge styling configuration
 */
export const getFraudBadgeStyle = (severity) => {
  const styles = {
    critical: {
      bg: 'bg-red-100',
      text: 'text-red-800',
      border: 'border-red-300',
      dot: 'bg-red-600 animate-pulse',
      icon: '🚨',
      label: 'FRAUD ALERT'
    },
    high: {
      bg: 'bg-orange-100',
      text: 'text-orange-800',
      border: 'border-orange-300',
      dot: 'bg-orange-600 animate-pulse',
      icon: '⚠️',
      label: 'High Risk'
    },
    medium: {
      bg: 'bg-yellow-100',
      text: 'text-yellow-800',
      border: 'border-yellow-300',
      dot: 'bg-yellow-600',
      icon: '⚡',
      label: 'Suspicious'
    },
    low: {
      bg: 'bg-blue-100',
      text: 'text-blue-800',
      border: 'border-blue-300',
      dot: 'bg-blue-600',
      icon: 'ℹ️',
      label: 'Monitor'
    }
  };

  return styles[severity] || styles.low;
};
