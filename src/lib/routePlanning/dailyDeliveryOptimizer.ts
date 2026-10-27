export interface DeliveryGroup {
    clientId: string;
  
    orderCount: number;
  
    subtotal: number;
  }
  
  export interface DeliveryBin {
    slotKey: string;
  
    groups: DeliveryGroup[];
  
    orderCount: number;
  
    subtotal: number;
  }
  
  function canPack(
    groupSizes: number[],
    capacities: number[]
  ): boolean {
    const sizes = [...groupSizes].sort(
      (a, b) => b - a
    );
  
    const memo = new Map<string, boolean>();
  
    function search(
      index: number,
      remainingCapacities: number[]
    ): boolean {
      if (index >= sizes.length) {
        return true;
      }
  
      const sortedCapacities = [
        ...remainingCapacities,
      ].sort((a, b) => b - a);
  
      const key = `${index}|${sortedCapacities.join(
        ","
      )}`;
  
      const cached = memo.get(key);
  
      if (cached !== undefined) {
        return cached;
      }
  
      const size = sizes[index];
  
      /*
       * If multiple bins have the exact same
       * capacity, trying each one produces
       * equivalent states.
       */
      const triedCapacities = new Set<number>();
  
      for (
        let i = 0;
        i < sortedCapacities.length;
        i++
      ) {
        const capacity =
          sortedCapacities[i];
  
        if (capacity < size) {
          continue;
        }
  
        if (
          triedCapacities.has(capacity)
        ) {
          continue;
        }
  
        triedCapacities.add(capacity);
  
        const next = [
          ...sortedCapacities,
        ];
  
        next[i] -= size;
  
        if (
          search(index + 1, next)
        ) {
          memo.set(key, true);
  
          return true;
        }
      }
  
      memo.set(key, false);
  
      return false;
    }
  
    return search(0, capacities);
  }
  
  function calculateMinimumRouteCount(
    groups: DeliveryGroup[],
    maxOrdersPerRoute: number
  ): number {
    const totalOrders = groups.reduce(
      (sum, group) =>
        sum + group.orderCount,
      0
    );
  
    const impossibleGroup =
      groups.find(
        (group) =>
          group.orderCount >
          maxOrdersPerRoute
      );
  
    if (impossibleGroup) {
      throw new Error(
        `Client ${impossibleGroup.clientId} has ` +
          `${impossibleGroup.orderCount} pending orders, ` +
          `which exceeds the maximum of ` +
          `${maxOrdersPerRoute} orders per route.`
      );
    }
  
    let routeCount = Math.ceil(
      totalOrders / maxOrdersPerRoute
    );
  
    while (
      routeCount <= groups.length
    ) {
      const capacities =
        Array(routeCount).fill(
          maxOrdersPerRoute
        );
  
      if (
        canPack(
          groups.map(
            (group) =>
              group.orderCount
          ),
          capacities
        )
      ) {
        return routeCount;
      }
  
      routeCount++;
    }
  
    throw new Error(
      "Could not create a valid delivery plan."
    );
  }
  
  export function optimizeDailyDeliveries(
    groups: DeliveryGroup[],
    maxOrdersPerRoute: number
  ) {
    if (!groups.length) {
      return {
        routeCount: 0,
        totalOrders: 0,
        totalSubtotal: 0,
        targetSubtotal: 0,
        bins: [] as DeliveryBin[],
      };
    }
  
    const routeCount =
      calculateMinimumRouteCount(
        groups,
        maxOrdersPerRoute
      );
  
    const totalOrders = groups.reduce(
      (sum, group) =>
        sum + group.orderCount,
      0
    );
  
    const totalSubtotal = groups.reduce(
      (sum, group) =>
        sum + group.subtotal,
      0
    );
  
    const targetSubtotal =
      totalSubtotal / routeCount;
  
    const targetOrders =
      totalOrders / routeCount;
  
    const bins: DeliveryBin[] =
      Array.from(
        {
          length: routeCount,
        },
        (_, index) => ({
          slotKey: `D${String(
            index + 1
          ).padStart(2, "0")}`,
  
          groups: [],
  
          orderCount: 0,
  
          subtotal: 0,
        })
      );
  
    /*
     * Put the largest financial stops first.
     *
     * This makes balancing substantially better
     * than assigning small stops first.
     */
    const sortedGroups = [
      ...groups,
    ].sort((a, b) => {
      if (
        b.subtotal !== a.subtotal
      ) {
        return (
          b.subtotal - a.subtotal
        );
      }
  
      return (
        b.orderCount -
        a.orderCount
      );
    });
  
    for (
      let index = 0;
      index < sortedGroups.length;
      index++
    ) {
      const group =
        sortedGroups[index];
  
      const remainingGroups =
        sortedGroups.slice(index + 1);
  
        const candidates = bins
        .map((bin, binIndex) => {
          if (
            bin.orderCount +
              group.orderCount >
            maxOrdersPerRoute
          ) {
            return null;
          }
      
          // -------------------------------------
          // Make sure remaining stops still fit.
          // -------------------------------------
      
          const capacities = bins.map(
            (
              candidateBin,
              candidateIndex
            ) => {
              let used =
                candidateBin.orderCount;
      
              if (
                candidateIndex ===
                binIndex
              ) {
                used +=
                  group.orderCount;
              }
      
              return (
                maxOrdersPerRoute -
                used
              );
            }
          );
      
          const stillFeasible =
            canPack(
              remainingGroups.map(
                (remainingGroup) =>
                  remainingGroup.orderCount
              ),
              capacities
            );
      
          if (!stillFeasible) {
            return null;
          }
      
          // -------------------------------------
          // PROJECT THE ENTIRE PLAN
          // -------------------------------------
      
          const projectedSubtotals =
            bins.map(
              (
                candidateBin,
                candidateIndex
              ) =>
                candidateBin.subtotal +
                (
                  candidateIndex ===
                  binIndex
                    ? group.subtotal
                    : 0
                )
            );
      
          const projectedOrders =
            bins.map(
              (
                candidateBin,
                candidateIndex
              ) =>
                candidateBin.orderCount +
                (
                  candidateIndex ===
                  binIndex
                    ? group.orderCount
                    : 0
                )
            );
      
          // -------------------------------------
          // GLOBAL SUBTOTAL VARIANCE
          // -------------------------------------
      
          const normalizedTargetSubtotal =
            targetSubtotal || 1;
      
          const subtotalVariance =
            projectedSubtotals.reduce(
              (sum, subtotal) => {
                const difference =
                  (
                    subtotal -
                    targetSubtotal
                  ) /
                  normalizedTargetSubtotal;
      
                /*
                 * Square the difference so large
                 * imbalances are punished heavily.
                 */
                return (
                  sum +
                  difference *
                    difference
                );
              },
              0
            );
      
          // -------------------------------------
          // GLOBAL ORDER COUNT VARIANCE
          // -------------------------------------
      
          const orderVariance =
            projectedOrders.reduce(
              (sum, orderCount) => {
                const difference =
                  (
                    orderCount -
                    targetOrders
                  ) /
                  maxOrdersPerRoute;
      
                return (
                  sum +
                  difference *
                    difference
                );
              },
              0
            );
      
          /*
           * Revenue balancing is MUCH more
           * important than equal order counts.
           *
           * Capacity remains a hard constraint,
           * not part of this score.
           */
          const score =
            subtotalVariance +
            orderVariance * 0.05;
      
          return {
            binIndex,
            score,
      
            projectedSubtotal:
              projectedSubtotals[
                binIndex
              ],
      
            projectedOrders:
              projectedOrders[
                binIndex
              ],
          };
        })
        .filter(
          (
            candidate
          ): candidate is NonNullable<
            typeof candidate
          > => candidate !== null
        )
        .sort(
          (a, b) => {
            if (
              a.score !==
              b.score
            ) {
              return (
                a.score -
                b.score
              );
            }
      
            /*
             * Tie breaker:
             * prefer the financially smaller route.
             */
            if (
              a.projectedSubtotal !==
              b.projectedSubtotal
            ) {
              return (
                a.projectedSubtotal -
                b.projectedSubtotal
              );
            }
      
            return (
              a.projectedOrders -
              b.projectedOrders
            );
          }
        );
  
      const selected =
        candidates[0];
  
      if (!selected) {
        throw new Error(
          `Unable to place delivery stop for client ${group.clientId}.`
        );
      }
  
      const bin =
        bins[selected.binIndex];
  
      bin.groups.push(group);
  
      bin.orderCount +=
        group.orderCount;
  
      bin.subtotal +=
        group.subtotal;
    }
  
    return {
      routeCount,
  
      totalOrders,
  
      totalSubtotal,
  
      targetSubtotal,
  
      bins,
    };
  }