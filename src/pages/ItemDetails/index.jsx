import {useEffect, useState} from 'react'
import {LineChart} from "./components/line-chart.jsx";
import {
    Accordion,
    Anchor,
    Card,
    Container,
    createStyles,
    Divider,
    Grid,
    Group,
    rem,
    SimpleGrid,
    Text,
    useMantineTheme
} from "@mantine/core";
import {useParams} from 'react-router-dom';
import ItemData from "../../utils/item-data.jsx";
import ProfitModifier from "./components/profit-modifier.jsx";
import GoalTracker from "./components/GoalTracker.jsx";
import {IconCalendarPlus} from "@tabler/icons-react";


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
    const theme = useMantineTheme();
    const {items} = ItemData();
    const {classes} = useStyles();
    const {id} = useParams();
    const [item, setItem] = useState('')

    const getColor = (color) => theme.colors[color][theme.colorScheme === 'dark' ? 5 : 7];

    useEffect(() => {
        setItem(() => items.find(i => Number(i.id) === Number(id)))
    }, [items, id]);


    const options = [
        {
            title: "Buy Price",
            data: item?.low
        }, {
            title: "Sell Price",
            data: item?.high
        },
        {
            title: "Profit",
            data: item?.profit,
            props: {
                color: Number(item?.profit) > 0 ? theme.colors.green[7] : theme.colors.red[9],
                fontWeight: 'bold'
            }
        }
    ]
    const itemInfo = options.map((option, idx) => (
        <Group position="apart" style={{padding: '8px 0'}} key={idx}>
            <Text className={classes.title} size="sm">
                {option.title}
            </Text>
            <Text {...option.props}>
                {option.data}
            </Text>
        </Group>
    ))


    return <>
        {
            item && Object.keys(item).length > 0 && (
                <SimpleGrid cols={2} spacing="sm" breakpoints={[{maxWidth: 'sm', cols: 1}]}>
                    <Grid gutter="sm">
                        <Grid.Col>
                            <Card withBorder radius="md" className={classes.card}>
                                <Group position="apart" style={{paddingBottom: '8px'}}>
                                    <Text className={classes.title}>
                                        {item.name}
                                    </Text>
                                    <Anchor size="xs" color="dimmed" sx={{lineHeight: 1}}>
                                        + 21 other services
                                    </Anchor>
                                </Group>
                                <Text style={{padding: '6px 0'}} size="xs">Buy/sell prices are updated every 60 seconds.
                                    Trade
                                    volumes and
                                    current price is
                                    updated every 5-minutes. Do a margin calculation in-game to check current prices.
                                </Text>
                                <Divider style={{margin: '6px 0'}}/>
                                {itemInfo}

                            </Card>
                        </Grid.Col>
                        <Grid.Col>
                            <GoalTracker/>
                        </Grid.Col>
                    </Grid>
                    <Grid gutter="sm">
                        <Grid.Col span={7}>
                            <ProfitModifier/>
                        </Grid.Col>
                        <Grid.Col span={5}>
                            <Card withBorder radius="md" className={classes.card}>
                                <Group position="apart">
                                    <Text className={classes.title} sx={{paddingBottom: 8}}>Helpful Information</Text>
                                </Group>

                                <Accordion variant="contained">
                                    <Accordion.Item value="Help">
                                        <Accordion.Control
                                            icon={<IconCalendarPlus size={rem(20)} color={getColor('teal')}/>}>
                                            Help
                                        </Accordion.Control>
                                        <Accordion.Panel sx={{fontSize: '0.8rem'}}>Use the profit track to record your
                                            transactions. The interface
                                            is designed
                                            to make it easy for you to add profits. Just enter the amount you earned
                                            from selling an item in the game, and it will be added to your profile. If
                                            needed, you can also update a transaction in your profile
                                            settings.
                                        </Accordion.Panel>
                                    </Accordion.Item>
                                </Accordion>
                            </Card>
                            {/*<Skeleton height={SECONDARY_COL_HEIGHT} radius="md" animate={false}/>*/}
                        </Grid.Col>
                    </Grid>
                </SimpleGrid>
            )
        }


        <Container size="70rem" px={0}>
            <LineChart/>
        </Container>


    </>
}