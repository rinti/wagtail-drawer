<script>
    import Item from './Item.svelte';

    let items = [];

    const fetchInitial = async () => {
        const response = await fetch('http://localhost:8000/admin/api/v2beta/pages/?child_of=1&for_explorer=1')
        const data = await response.json()
        items = data.items
    }

    const topLevelItems = () => {
        const x = items.filter(item => item.parent === undefined)
        return x
    }

    fetchInitial()
</script>

<style>
</style>

<ul>
    {#each topLevelItems(items) as item}
        <Item {item} />
    {/each}
</ul>
