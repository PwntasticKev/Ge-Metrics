import {useState} from 'react';
import {
    Center,
    createStyles,
    Group,
    Image,
    Loader,
    Pagination,
    rem,
    ScrollArea,
    Table,
    Text,
    TextInput,
    UnstyledButton,
    useMantineTheme
} from '@mantine/core';
import {IconChevronDown, IconChevronUp, IconSearch, IconSelector} from '@tabler/icons-react';
import TableSettingsMenu from "./components/TableSettingsMenu.jsx";
import {Link} from 'react-router-dom';

const useStyles = createStyles((theme) => ({
    th: {
        padding: '0 !important',
    },

    control: {
        width: '100%',
        padding: `${theme.spacing.xs} ${theme.spacing.md}`,

        '&:hover': {
            backgroundColor: theme.colorScheme === 'dark' ? theme.colors.dark[6] : theme.colors.gray[0],
        },
    },

    icon: {
        width: rem(21),
        height: rem(21),
        borderRadius: rem(21),
    },

    header: {
        position: 'sticky',
        top: 0,
        backgroundColor: theme.colorScheme === 'dark' ? theme.colors.dark[7] : theme.white,
        transition: 'box-shadow 150ms ease',
        zIndex: 2,

        '&::after': {
            content: '""',
            position: 'absolute',
            left: 0,
            right: 0,
            bottom: 0,
            borderBottom: `${rem(1)} solid ${
                theme.colorScheme === 'dark' ? theme.colors.dark[3] : theme.colors.gray[2]
            }`,
        },
    },

    scrolled: {
        boxShadow: theme.shadows.sm,
    },

    image: {
        maxWidth: '40%',

        [theme.fn.smallerThan('sm')]: {
            maxWidth: '100%',
        },
    },
}));


function Th({children, reversed, sorted, onSort}) {
    const {classes} = useStyles();
    const Icon = sorted ? (reversed ? IconChevronUp : IconChevronDown) : IconSelector;
    return (
        <th className={classes.th}>
            <UnstyledButton onClick={onSort} className={classes.control}>
                <Group position="apart">
                    <Text fz="sm">
                        {children}
                    </Text>
                    <Center className={classes.icon}>
                        <Icon size="0.9rem" stroke={1.5}/>
                    </Center>
                </Group>
            </UnstyledButton>
        </th>
    );
}

function filterData(data, search) {
    const query = search.toLowerCase().trim();
    return data.filter((item) =>
        Object.keys(item).some((key) => {
            const value = item[key];
            if (typeof value === "string") {
                return value.toLowerCase().includes(query);
            }
            return false;
        })
    );
}

function sortData(data, payload) {
    const {sortBy} = payload;

    if (!sortBy) {
        return filterData(data, payload.search);
    }

    return filterData(
        [...data].sort((a, b) => {
            if (payload.reversed) {
                return b[sortBy]?.localeCompare(a[sortBy]);
            }

            return a[sortBy].localeCompare(b[sortBy]);
        }),
        payload.search
    );
}


export function TableSort({data}) {
    const theme = useMantineTheme();

    const {classes, cx} = useStyles();
    const [search, setSearch] = useState('');
    const [sortedData, setSortedData] = useState(data);
    const [scrolled, setScrolled] = useState(false);
    const [sortBy, setSortBy] = useState(null);
    const [reverseSortDirection, setReverseSortDirection] = useState(false);

    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 60;


    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const currentPageData = sortedData.slice(startIndex, endIndex);


    const setSorting = (field) => {
        const reversed = field === sortBy ? !reverseSortDirection : false;
        setReverseSortDirection(reversed);
        setSortBy(field);
        setSortedData(sortData(sortedData, {sortBy: field, reversed, search}));
    };

    const handleSearchChange = (event) => {
        const {value} = event.currentTarget;
        setSearch(value);
        setSortedData(sortData(data, {sortBy, reversed: reverseSortDirection, search: value}));
    };
    const rows = currentPageData.map((row) => {
        const profitValue = Number(row.profit.replace(/,/g, ''))
        return (
            <tr key={row.name}>
                {/*<td>{row.id}</td>*/}
                <td>
                    {
                        row.img ?
                            <Image
                                className={classes.image}
                                fit="contain"
                                height={40}
                                placeholder={
                                    <Text align="center">Not available</Text>
                                }
                                src={row.img}
                                withPlaceholder
                            />
                            :
                            <Loader/>
                    }
                </td>

                <td colSpan="2"><Link to={`/item/${row.id}`} style={{textDecoration: 'none'}}>{row.name}  </Link></td>

                <td>{row.limit}</td>
                <td>{row.low}</td>
                <td>{row.high}</td>
                <td style={{
                    color: profitValue > 0 ? theme.colors.green[9] : theme.colors.red[9],
                }}>
                    {row.profit}
                </td>
                <td><TableSettingsMenu/></td>
            </tr>
        )
    });


    return (
        <ScrollArea onScrollPositionChange={({y}) => setScrolled(y !== 0)}>

            <TextInput
                placeholder="Search by any field"
                mb="md"
                icon={<IconSearch size="0.9rem" stroke={1.5}/>}
                value={search}
                onChange={handleSearchChange}
            />
            <Table verticalSpacing="xs" sx={{tableLayout: 'fixed'}}>

                <thead className={cx(classes.header, classes.scrolled)}>
                <tr>
                    {/*<Th>Id</Th>*/}
                    <Th>Img</Th>
                    <Th colSpan={2}>
                        Name
                    </Th>
                    <Th>Buy Limit</Th>
                    <Th>Buy Price</Th>
                    <Th>Sell Price</Th>
                    <Th
                        sorted={sortBy === 'profit'}
                        reversed={reverseSortDirection}
                        onSort={() => setSorting('profit')}
                    >
                        Profit
                    </Th>
                    <Th>Settings</Th>
                </tr>
                </thead>
                <tbody>
                {rows.length > 0 ? (
                    rows
                ) : (
                    <tr>
                        <td colSpan={data.length && Object.keys(data[0]).length}>
                            <Text weight={500} align="center">
                                Nothing found
                            </Text>
                        </td>
                    </tr>
                )}
                </tbody>
            </Table>
            <Pagination
                total={Math.ceil(sortedData.length / itemsPerPage)}
                value={currentPage}
                onChange={setCurrentPage}
                gutter="md"
                mt="md"
                mb="md"
            />
        </ScrollArea>
    );
}

export default TableSort