<script>
    export let data = {items: []};
    export let mock = true;

    const fetchInitial = async () => {
        const response = await fetch('http://localhost:8000/admin/api/v2beta/pages/?child_of=1&for_explorer=1')
        data = await response.json()
        console.log(data)
    }

    const fetchChildren = async (e, item) => {
        e.preventDefault()
        const url = item.meta.children.listing_url.replace('localhost', 'localhost:8000')

        const response = await fetch(url)
        data = await response.json()
    }

    fetchInitial()
</script>

<style>
</style>

<ul>
{#each data.items as item}
    <li>
        <a href="#" on:click={(e) => fetchChildren(e, item)}>
            {#if item.meta.children}&gt;{/if} {item.title}
        </a>
        {#if item.items}
            <ul>
                {#each item.items as child}
                    <a href="" on:click={(e) => fetchChildren(e, child)}>
                        {#if child.meta.children}&gt;{/if} {child.title}
                    </a>
                {/each}
            </ul>
        {/if}
    </li>
{/each}
</ul>
