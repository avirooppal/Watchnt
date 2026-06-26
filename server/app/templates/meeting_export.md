# {{ meeting.title }}

**Date:** {{ meeting.date }}
**Duration:** {{ meeting.duration }}

## Executive Summary
{{ meeting.summary.executive_summary }}

## Key Points
{% for point in meeting.summary.key_points %}
- {{ point }}
{% endfor %}

## Action Items
{% for item in meeting.action_items.action_items %}
- [ ] **{{ item.assignee }}**: {{ item.task }}
{% endfor %}

## Decisions
{% for decision in meeting.decisions.decisions %}
- **{{ decision.decision }}** (Made by: {{ decision.deciders | join(', ') }})
{% endfor %}
