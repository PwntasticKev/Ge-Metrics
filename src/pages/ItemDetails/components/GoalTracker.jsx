import { Badge, createStyles, Group, Paper, Progress, rem, Text, ThemeIcon } from '@mantine/core'
import { IconCoins } from '@tabler/icons-react'

const ICON_SIZE = rem(60)

const useStyles = createStyles((theme) => ({
  card: {
    position: 'relative',
    overflow: 'visible',
    padding: theme.spacing.xl,
    paddingTop: `calc(${theme.spacing.xl} * 1.5 + ${ICON_SIZE} / 3)`
  },

  icon: {
    position: 'absolute',
    top: `calc(-${ICON_SIZE} / 3)`,
    left: `calc(50% - ${ICON_SIZE} / 2)`
  },

  title: {
    fontFamily: `Greycliff CF, ${theme.fontFamily}`,
    lineHeight: 1
  }
}))

export default function GoalTracker () {
  const { classes } = useStyles()

  return (
        <Paper radius="md" withBorder className={classes.card} mt={`calc(${ICON_SIZE} / 3)`}>
            <ThemeIcon className={classes.icon} size={ICON_SIZE} radius={ICON_SIZE}>
                <IconCoins size="2rem" stroke={1.5}/>
            </ThemeIcon>

            <Text ta="center" fw={700} className={classes.title}>
                Monthly Statistics
            </Text>
            <Text c="dimmed" ta="center" fz="sm">
                {/* Goal Data Here */}
                50 mil
            </Text>

            <Group position="apart" mt="xs">
                <Text fz="sm" color="dimmed">
                    Progress
                </Text>
                <Text fz="sm" color="dimmed">
                    62%
                </Text>
            </Group>

            <Progress value={62} mt={5}/>

            <Group position="apart" mt="md">
                <Text fz="sm">20 / 36 km</Text>
                <Badge size="sm">4 days left</Badge>
            </Group>
        </Paper>
  )
}
