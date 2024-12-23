import { useContext, useState } from 'react'
import { AuthContext } from '../../utils/firebase/auth-context.jsx'
import { Button, Center, Flex, Grid, Image, Indicator, Text, useMantineTheme } from '@mantine/core'
import { IconChevronRight, IconCircleDotted, IconLogout, IconSettings2 } from '@tabler/icons-react'
import jmodImage from '../../assets/jmod.png'
import { handleLogout } from '../../utils/firebase/firebase-methods.jsx'
import UserEdit from './components/modals/user-edit.jsx'
import UserGoals from './components/modals/user-goals.jsx'
import UserSubscription from './components/modals/user-subscription.jsx'

export default function Profile () {
  const theme = useMantineTheme()
  const { user } = useContext(AuthContext)
  const [activeModal, setActiveModal] = useState('')
  const isPremiumMember = true // this will be context
  const rsName = 'Pwntastic' // will be queried

  const userOptions = [
    {
      icon: <IconCircleDotted/>,
      title: 'Goals',
      modal: 'goals'
    },
    {
      icon: <IconSettings2/>,
      title: 'Subscription Settings',
      modal: 'subscription'
    }
  ]

  const userNavigation = userOptions.map((item, idx) => (
        <Flex key={idx} align="center" justify="space-between" sx={{ marginBottom: 12 }}
              onClick={() => setActiveModal(item.modal)}>
            <Flex>
                <Button size="xs" variant="light" color="violet" radius="xl">
                    {item.icon}
                </Button>
                <Text fz="md" sx={{ marginLeft: 8 }}>
                    {item.title}
                </Text>
            </Flex>
            <Button size="xs" variant="light">
                <IconChevronRight size={14}/>
            </Button>
        </Flex>
  ))

  return <>
        <UserEdit/>
        {
            activeModal === 'goals' && <UserGoals open={true} handleChange={setActiveModal}/>
        }
        {
            activeModal === 'subscription' && <UserSubscription open={true} handleChange={setActiveModal}/>
        }

        <Grid grow gutter="sm">
            <Grid.Col sx={{ position: 'relative' }}>
                <Center mx="auto">
                    <Indicator label={<Image height={20} width={20} src={jmodImage} alt="Custom Icon"/>}
                               inline
                               size={20}
                               offset={12}
                               position="bottom-end"
                               color="none"
                    >
                        <Image
                            withPlaceholder
                            alt="With default placeholder"
                            height={150}
                            radius='xl'
                            src='https://images.unsplash.com/photo-1633332755192-727a05c4013d?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1760&q=80'
                            width={150}
                        /></Indicator>
                </Center>

            </Grid.Col>
            <Grid.Col>
                {
                    isPremiumMember
                      ? (
                            <Text c="dimmed" fz="xs" sx={{ textAlign: 'center' }}>
                                Premium Member
                            </Text>
                        )
                      : (
                            <Center sx={{ margin: '8px 0' }}>
                                <Button>
                                    Upgrade to Premium
                                </Button>
                            </Center>
                        )
                }
                <Text fw={800} fz="xl" sx={{ textAlign: 'center' }}>
                    {
                        rsName
                          ? (
                                <Center>
                                    {rsName}
                                    {
                                        isPremiumMember

                                    }
                                </Center>

                            )
                          : user.email
                    }

                </Text>
            </Grid.Col>
            <Grid.Col span={12}>
                {userNavigation}
            </Grid.Col>
        </Grid>
        <Button variant="light" sx={{ marginTop: '20px' }} onClick={() => handleLogout}>
            <IconLogout/>
            Sign Out
        </Button>
    </>
}
