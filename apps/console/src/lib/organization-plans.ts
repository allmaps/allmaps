import {
  ORGANIZATION_PLANS,
  type OrganizationPlan
} from '@allmaps/api-shared/tiers'

export { ORGANIZATION_PLANS }
export type { OrganizationPlan }

export const organizationPlanDetails = {
  contributor: {
    label: 'Contributor',
    icon: '🤝',
    class: 'bg-blue-100 text-blue-700'
  },
  supporter: {
    label: 'Supporter',
    icon: '🌱',
    class: 'bg-green-100 text-green-700'
  },
  innovator: {
    label: 'Innovator',
    icon: '🚀',
    class: 'bg-purple-100 text-purple-700'
  }
} satisfies Record<
  OrganizationPlan,
  { label: string; icon: string; class: string }
>

export const organizationPlanItems = [
  { value: '', label: '— No plan' },
  ...ORGANIZATION_PLANS.map((plan) => ({
    value: plan,
    label: `${organizationPlanDetails[plan].icon} ${organizationPlanDetails[plan].label}`
  }))
]

export const organizationPlanOrder = Object.fromEntries(
  ORGANIZATION_PLANS.map((plan, index) => [plan, index + 1])
) as Record<OrganizationPlan, number>
