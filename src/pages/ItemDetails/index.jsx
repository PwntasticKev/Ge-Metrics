import {useEffect, useState} from 'react'
import {LineChart} from "./components/line-chart.jsx";
import {useQuery} from "react-query";
import {getItemHistoryById} from "../../api/rs-wiki-api.jsx";
import {
    Anchor,
    Card,
    Center,
    Container,
    createStyles,
    Grid,
    Group,
    Loader,
    rem,
    SimpleGrid,
    Text,
} from "@mantine/core";
import {useParams} from 'react-router-dom';
import {getItemById} from '../../utils/utils.jsx'

const useStyles = createStyles((theme) => ({
    card: {
        backgroundColor: theme.colorScheme === 'dark' ? theme.colors.dark[6] : theme.colors.gray[0],
    },

    title: {
        fontFamily: `Greycliff CF, ${theme.fontFamily}`,
        fontWeight: 700,
    },

    item: {
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        textAlign: 'center',
        borderRadius: theme.radius.md,
        height: rem(90),
        backgroundColor: theme.colorScheme === 'dark' ? theme.colors.dark[7] : theme.white,
        transition: 'box-shadow 150ms ease, transform 100ms ease',

        '&:hover': {
            boxShadow: theme.shadows.md,
            transform: 'scale(1.05)',
        },
    },
}));


export default function ItemDetails() {
    const {classes} = useStyles();
    const {id} = useParams();
    const [timeframe, setTimeframe] = useState('1h')
    const [item, setItem] = useState('')

    useEffect(() => setItem(getItemById(id)), [id])

    const {data: historyData, status: historyStatus} = useQuery(
        {
            queryKey: ['priceData'],
            queryFn: async () => await getItemHistoryById(timeframe, id),
            // refetchInterval: 60 * 1000,
        });
    const nestedHistoryData = historyData?.data?.data || [];

    return <>
        <Container size="xl" mx="0">
            <SimpleGrid cols={2} spacing="sm" breakpoints={[{maxWidth: 'sm', cols: 1}]} styles={(theme) => ({
                backgroundColor:
                    theme.colorScheme === 'dark'
                        ? theme.colors.dark[8]
                        : theme.colors.gray[0],
            })}>
                <Card withBorder radius="md" className={classes.card}>
                    <Group position="apart">
                        <Text className={classes.title}>
                            {item.name}
                        </Text>
                        <Anchor size="xs" color="dimmed" sx={{lineHeight: 1}}>
                            + 21 other services
                        </Anchor>
                    </Group>
                </Card>
                <Grid gutter="sm">
                    <Grid.Col>
                        <Card withBorder radius="md" className={classes.card}>
                            <Group position="apart">
                                <Text className={classes.title}>Services</Text>
                                <Anchor size="xs" color="dimmed" sx={{lineHeight: 1}}>
                                    + 21 other services
                                </Anchor>
                            </Group>
                        </Card>
                        {/*<Skeleton height={SECONDARY_COL_HEIGHT} radius="md" animate={false}/>*/}
                    </Grid.Col>
                    <Grid.Col span={6}>
                        <Card withBorder radius="md" className={classes.card}>
                            <Group position="apart">
                                <Text className={classes.title}>Services</Text>
                                <Anchor size="xs" color="dimmed" sx={{lineHeight: 1}}>
                                    + 21 other services
                                </Anchor>
                            </Group>
                        </Card>
                        {/*<Skeleton height={SECONDARY_COL_HEIGHT} radius="md" animate={false}/>*/}
                    </Grid.Col>
                    <Grid.Col span={6}>
                        <Card withBorder radius="md" className={classes.card}>
                            <Group position="apart">
                                <Text className={classes.title}>Services</Text>
                                <Anchor size="xs" color="dimmed" sx={{lineHeight: 1}}>
                                    + 21 other services
                                </Anchor>
                            </Group>
                        </Card>
                        {/*<Skeleton height={SECONDARY_COL_HEIGHT} radius="md" animate={false}/>*/}
                    </Grid.Col>
                </Grid>
            </SimpleGrid>
        </Container>


        {historyStatus === "error" && <p>Error fetching data</p>}
        {
            historyStatus === "loading" &&
            <Center maw={400} h={300} mx="auto">
                <Loader/>
            </Center>
        }
        {historyStatus === "success" && (
            <Container size="md" px="md">
                <LineChart data={nestedHistoryData} timeframe={timeframe}/>
            </Container>
        )}

    </>
}