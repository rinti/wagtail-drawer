<script>
    let children = [];
    export let item;

    const fetchChildren = async () => {
        const url = item.meta.children.listing_url.replace('localhost', 'localhost:8000')
        const response = await fetch(`${url}&for_explorer=1`)

        const data = await response.json()
        children = data.items
    }

    $: hasChildren = item.meta.children && item.meta.children.count > 0;
</script>

<style>
</style>

<li>
    <a href="#" on:click={() => fetchChildren(item)}>
        {#if hasChildren}&gt;{/if} {item.title}
    </a>
    {#if children.length > 0}
        <ul>
            {#each children as child}
                <svelte:self item={child} />
            {/each}
        </ul>
    {/if}
</li>
